import {
  doc,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { nanoid } from "./utils";
import { notifyEvent } from "./notifications";

export const PAYMENT_METHODS = {
  CASH: "CASH",
  CARD: "CARD",
  BANK_TRANSFER: "BANK_TRANSFER",
  ONLINE: "ONLINE",
};

export const SALE_STATUS = {
  COMPLETED: "COMPLETED",
  PENDING: "PENDING",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
};

/**
 * Complete a sale atomically:
 * 1. Validate stock for each item
 * 2. Create sale document
 * 3. Reduce product stock + create stock movements
 * 4. Update customer totals
 * 5. Returns the saleId
 */
export async function completeSale(businessId, {
  items,
  customerId = null,
  customerName = "",
  subtotal,
  discount = 0,
  tax = 0,
  total,
  paymentMethod,
  notes = "",
  userId = "",
  userName = "",
  invoicePrefix = "INV",
  allowNegative = false,
}) {
  if (!businessId) throw new Error("No business context");
  if (!items || items.length === 0) throw new Error("Sale has no items");
  if (subtotal == null || total == null) throw new Error("Sale totals are missing");

  const saleId = nanoid();
  const timestamp = Date.now();
  const invoiceNumber = `${invoicePrefix}-${timestamp}`;

  const saleRef = doc(db, "businesses", businessId, "sales", saleId);

  const result = await runTransaction(db, async (transaction) => {
    const stockChecks = [];
    for (const item of items) {
      if (!item.productId) throw new Error("Item missing product");
      const productRef = doc(db, "businesses", businessId, "products", item.productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) {
        throw new Error(`Product "${item.productName}" not found`);
      }
      const product = productSnap.data();
      const currentStock = Number(product.currentStock || 0);
      const qty = Number(item.quantity || 0);
      if (qty <= 0) throw new Error(`Invalid quantity for "${item.productName}"`);
      if (currentStock < qty && !allowNegative) {
        throw new Error(
          `Insufficient stock for "${item.productName}". Only ${currentStock} available.`
        );
      }
      stockChecks.push({ productRef, product, qty, item });
    }

    // Snapshot items in the sale
    const saleItems = stockChecks.map(({ product, qty, item }) => ({
      productId: item.productId,
      productName: item.productName || product.name,
      sku: item.sku || product.sku || "",
      quantity: qty,
      unitPrice: Number(item.unitPrice) || Number(product.sellingPrice) || 0,
      purchasePrice: Number(product.purchasePrice) || 0,
      total: Number(item.total) || Number(item.unitPrice) * qty || 0,
    }));

    transaction.set(saleRef, {
      invoiceNumber,
      customerId: customerId || null,
      customerName: customerName || "Walk-in Customer",
      items: saleItems,
      subtotal: Number(subtotal),
      discount: Number(discount),
      tax: Number(tax),
      total: Number(total),
      paymentMethod,
      status: SALE_STATUS.COMPLETED,
      notes: notes || "",
      createdBy: userName || "",
      userId: userId || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Reduce stock + create stock movements + activity log
    for (const { productRef, product, qty, item } of stockChecks) {
      const previousStock = Number(product.currentStock || 0);
      const newStock = Math.max(0, previousStock - qty);
      transaction.update(productRef, {
        currentStock: newStock,
        updatedAt: serverTimestamp(),
      });

      const movementRef = doc(db, "businesses", businessId, "stockMovements", nanoid());
      transaction.set(movementRef, {
        productId: item.productId,
        productName: product.name || "",
        type: "SALE",
        quantity: qty,
        previousStock,
        newStock,
        difference: newStock - previousStock,
        reason: `Sale ${invoiceNumber}`,
        userId: userId || "",
        userName: userName || "",
        locationId: null,
        referenceId: saleId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Update customer totals
    if (customerId) {
      const customerRef = doc(db, "businesses", businessId, "customers", customerId);
      const customerSnap = await transaction.get(customerRef);
      if (customerSnap.exists()) {
        transaction.update(customerRef, {
          totalOrders: increment(1),
          totalSpent: increment(Number(total)),
          lastPurchaseAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Activity log
    const logRef = doc(db, "businesses", businessId, "activityLogs", nanoid());
    transaction.set(logRef, {
      userId: userId || "",
      userName: userName || "",
      action: "COMPLETED_SALE",
      resource: "sales",
      resourceId: saleId,
      description: `Created sale ${invoiceNumber} for ${formatMoney(total)}`,
      createdAt: serverTimestamp(),
    });

    return { saleId, invoiceNumber };
  });

  notifyEvent(businessId, {
    type: "NEW_SALE",
    title: "New sale completed",
    message: `${result.invoiceNumber} for ${formatMoney(total)}`,
    referenceId: result.saleId,
    userId,
  });

  return result;
}

function formatMoney(value) {
  return new Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}