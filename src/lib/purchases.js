import { doc, runTransaction, serverTimestamp, increment } from "firebase/firestore";
import { db } from "./firebase";
import { nanoid, formatCurrency } from "./utils";
import { MOVEMENT_TYPES } from "./inventory";
import { notifyEvent } from "./notifications";

export const PURCHASE_STATUS = {
  DRAFT: "DRAFT",
  ORDERED: "ORDERED",
  PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
};

export const PURCHASE_STATUS_LABELS = {
  DRAFT: "Draft",
  ORDERED: "Ordered",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

/**
 * Create a purchase order. Items: [{ productId, productName, sku, quantity, unitCost }]
 * Also validate the product exists and snapshots current values.
 */
export async function createPurchase(businessId, {
  supplierId = null,
  supplierName = null,
  items,
  status = PURCHASE_STATUS.ORDERED,
  notes = "",
  userId = "",
  userName = "",
}) {
  if (!businessId) throw new Error("No business context");
  if (!items || items.length === 0) throw new Error("Purchase has no items");

  const purchaseId = nanoid();
  const purchaseRef = doc(db, "businesses", businessId, "purchases", purchaseId);

  const result = await runTransaction(db, async (transaction) => {
    const resolvedItems = [];
    for (const item of items) {
      if (!item.productId) throw new Error("Item missing product");
      const qty = Number(item.quantity || 0);
      const unitCost = Number(item.unitCost || 0);
      if (qty <= 0) throw new Error("Quantity must be greater than zero");

      const productRef = doc(db, "businesses", businessId, "products", item.productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) throw new Error(`Product "${item.productName}" not found`);
      const product = productSnap.data();

      resolvedItems.push({
        productId: item.productId,
        productName: item.productName || product.name,
        sku: item.sku || product.sku || "",
        quantity: qty,
        unitCost,
        total: qty * unitCost,
        received: 0,
      });
    }

    const subtotal = resolvedItems.reduce((s, i) => s + i.total, 0);

    transaction.set(purchaseRef, {
      supplierId: supplierId || null,
      supplierName: supplierName || "Unknown Supplier",
      items: resolvedItems,
      subtotal,
      status,
      notes: notes || "",
      userId: userId || "",
      userName: userName || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logRef = doc(db, "businesses", businessId, "activityLogs", nanoid());
    transaction.set(logRef, {
      userId: userId || "",
      userName: userName || "",
      action: "CREATE_PURCHASE",
      resource: "purchases",
      resourceId: purchaseId,
      description: `Created purchase order for ${formatCurrency(subtotal)}`,
      createdAt: serverTimestamp(),
    });

    return { purchaseId, subtotal };
  });

  notifyEvent(businessId, {
    type: "NEW_PURCHASE",
    title: "New purchase order",
    message: `Purchase order created for ${formatCurrency(result.subtotal)}`,
    referenceId: result.purchaseId,
    userId,
  });

  return result;
}

/**
 * Receive a purchase: update every product's stock, create STOCK_IN movements,
 * update the purchase to RECEIVED, refresh the supplier, and log it.
 * Pass the purchase document(s) to receive.
 */
export async function receivePurchase(businessId, purchase, {
  userId = "",
  userName = "",
}) {
  if (!businessId || !purchase) throw new Error("No purchase to receive");
  if (purchase.status === PURCHASE_STATUS.RECEIVED) {
    throw new Error("This purchase is already received");
  }
  if (purchase.status === PURCHASE_STATUS.CANCELLED) {
    throw new Error("This purchase was cancelled");
  }

  const purchaseRef = doc(db, "businesses", businessId, "purchases", purchase.id);

  return runTransaction(db, async (transaction) => {
    const purchaseSnap = await transaction.get(purchaseRef);
    if (!purchaseSnap.exists()) throw new Error("Purchase not found");
    const data = purchaseSnap.data();

    for (const item of data.items || []) {
      const qty = Number(item.quantity || 0);
      if (qty <= 0) continue;

      const productRef = doc(db, "businesses", businessId, "products", item.productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) continue;
      const product = productSnap.data();

      const previousStock = Number(product.currentStock || 0);
      const newStock = previousStock + qty;

      transaction.update(productRef, {
        currentStock: newStock,
        updatedAt: serverTimestamp(),
      });

      const movementRef = doc(db, "businesses", businessId, "stockMovements", nanoid());
      transaction.set(movementRef, {
        productId: item.productId,
        productName: item.productName || product.name || "",
        type: MOVEMENT_TYPES.STOCK_IN,
        quantity: qty,
        previousStock,
        newStock,
        difference: newStock - previousStock,
        reason: `Purchase received`,
        userId: userId || "",
        userName: userName || "",
        locationId: null,
        referenceId: purchase.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const subtotal = Number(data.subtotal || 0);

    transaction.update(purchaseRef, {
      status: PURCHASE_STATUS.RECEIVED,
      receivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (data.supplierId) {
      const supplierRef = doc(db, "businesses", businessId, "suppliers", data.supplierId);
      const supplierSnap = await transaction.get(supplierRef);
      if (supplierSnap.exists()) {
        transaction.update(supplierRef, {
          totalPurchases: increment(1),
          totalPurchaseAmount: increment(subtotal),
          lastPurchaseAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const logRef = doc(db, "businesses", businessId, "activityLogs", nanoid());
    transaction.set(logRef, {
      userId: userId || "",
      userName: userName || "",
      action: "RECEIVE_PURCHASE",
      resource: "purchases",
      resourceId: purchase.id,
      description: `Received purchase of ${formatCurrency(subtotal)}`,
      createdAt: serverTimestamp(),
    });

    return { purchaseId: purchase.id, subtotal };
  });
}

export async function cancelPurchase(businessId, purchaseId, {
  userId = "",
  userName = "",
}) {
  if (!businessId || !purchaseId) throw new Error("No purchase to cancel");

  const purchaseRef = doc(db, "businesses", businessId, "purchases", purchaseId);

  return runTransaction(db, async (transaction) => {
    const purchaseSnap = await transaction.get(purchaseRef);
    if (!purchaseSnap.exists()) throw new Error("Purchase not found");
    const data = purchaseSnap.data();
    if (data.status === PURCHASE_STATUS.RECEIVED) {
      throw new Error("Received purchases cannot be cancelled");
    }

    transaction.update(purchaseRef, {
      status: PURCHASE_STATUS.CANCELLED,
      updatedAt: serverTimestamp(),
    });

    const logRef = doc(db, "businesses", businessId, "activityLogs", nanoid());
    transaction.set(logRef, {
      userId: userId || "",
      userName: userName || "",
      action: "CANCEL_PURCHASE",
      resource: "purchases",
      resourceId: purchaseId,
      description: `Cancelled purchase order`,
      createdAt: serverTimestamp(),
    });

    return { purchaseId };
  });
}