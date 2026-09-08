import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { nanoid, formatCurrency } from "./utils";
import { MOVEMENT_TYPES } from "./inventory";
import { SALE_STATUS } from "./sales";
import { notifyEvent } from "./notifications";

export const RETURN_REASONS = {
  DAMAGED: "DAMAGED",
  WRONG_PRODUCT: "WRONG_PRODUCT",
  CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
  DEFECTIVE: "DEFECTIVE",
  OTHER: "OTHER",
};

export const RETURN_REASON_LABELS = {
  DAMAGED: "Damaged",
  WRONG_PRODUCT: "Wrong Product",
  CUSTOMER_REQUEST: "Customer Request",
  DEFECTIVE: "Defective",
  OTHER: "Other",
};

/**
 * Process a customer return.
 * items: [{ productId, productName, unitPrice, quantity }]
 * Restores stock, creates RETURN movements, records the return,
 * marks the sale REFUNDED, and logs the action.
 */
export async function processReturn(businessId, {
  sale,
  items,
  reason,
  refundAmount,
  notes = "",
  userId = "",
  userName = "",
}) {
  if (!businessId) throw new Error("No business context");
  if (!sale) throw new Error("Select the original sale");
  if (!items || items.length === 0) throw new Error("Select at least one item to return");
  if (!reason) throw new Error("Select a return reason");

  const returnId = nanoid();
  const returnRef = doc(db, "businesses", businessId, "returns", returnId);
  const saleRef = doc(db, "businesses", businessId, "sales", sale.id);

  const result = await runTransaction(db, async (transaction) => {
    const saleSnap = await transaction.get(saleRef);
    if (!saleSnap.exists()) throw new Error("Sale not found");
    const saleData = saleSnap.data();
    if (saleData.status !== SALE_STATUS.COMPLETED) {
      throw new Error("Only completed sales can be returned");
    }

    const returnedItems = [];
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (qty <= 0) throw new Error("Return quantity must be greater than zero");

      const productRef = doc(db, "businesses", businessId, "products", item.productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) throw new Error(`Product "${item.productName}" not found`);
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
        type: MOVEMENT_TYPES.RETURN,
        quantity: qty,
        previousStock,
        newStock,
        difference: newStock - previousStock,
        reason: `Return (${reason})`,
        userId: userId || "",
        userName: userName || "",
        locationId: null,
        referenceId: returnId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      returnedItems.push({
        productId: item.productId,
        productName: item.productName || product.name || "",
        quantity: qty,
        unitPrice: Number(item.unitPrice) || 0,
        refund: Number(item.unitPrice) * qty,
      });
    }

    transaction.set(returnRef, {
      saleId: sale.id,
      invoiceNumber: saleData.invoiceNumber || sale.id,
      customerId: saleData.customerId || null,
      customerName: saleData.customerName || "Walk-in Customer",
      items: returnedItems,
      refundAmount: Number(refundAmount) || returnedItems.reduce((s, i) => s + i.refund, 0),
      reason,
      notes: notes || "",
      userId: userId || "",
      userName: userName || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(saleRef, {
      status: SALE_STATUS.REFUNDED,
      updatedAt: serverTimestamp(),
    });

    const logRef = doc(db, "businesses", businessId, "activityLogs", nanoid());
    transaction.set(logRef, {
      userId: userId || "",
      userName: userName || "",
      action: "PROCESS_RETURN",
      resource: "returns",
      resourceId: returnId,
      description: `Processed return for ${saleData.invoiceNumber || sale.id}`,
      createdAt: serverTimestamp(),
    });

    return { returnId };
  });

  notifyEvent(businessId, {
    type: "RETURN",
    title: "Return processed",
    message: `Refund of ${formatCurrency(Number(refundAmount) || 0)} processed`,
    referenceId: result.returnId,
    userId,
  });

  return result;
}