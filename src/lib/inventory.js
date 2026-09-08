import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { nanoid } from "./utils";

export const MOVEMENT_TYPES = {
  STOCK_IN: "STOCK_IN",
  STOCK_OUT: "STOCK_OUT",
  SALE: "SALE",
  RETURN: "RETURN",
  DAMAGED: "DAMAGED",
  EXPIRED: "EXPIRED",
  LOST: "LOST",
  ADJUSTMENT: "ADJUSTMENT",
  TRANSFER_OUT: "TRANSFER_OUT",
  TRANSFER_IN: "TRANSFER_IN",
};

/**
 * Apply a stock change to a product with full audit trail.
 * Uses a Firestore transaction so stock + movement stay consistent.
 *
 * onProducts change: productId, quantity (+/-), type, reason, userId, userName,
 * locationId (optional), referenceId (optional), allowNegative (optional).
 */
export async function applyStockChange(businessId, {
  productId,
  quantity,
  type,
  reason = "",
  userId = "",
  userName = "",
  locationId = null,
  referenceId = null,
  allowNegative = false,
}) {
  if (!businessId) throw new Error("No business context");
  if (!productId) throw new Error("Product is required");
  if (quantity === 0) throw new Error("Quantity cannot be zero");

  const productRef = doc(db, "businesses", businessId, "products", productId);

  return runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) throw new Error("Product not found");
    const product = productSnap.data();

    const previousStock = Number(product.currentStock || 0);
    let newStock = previousStock + quantity;

    if (newStock < 0 && !allowNegative) {
      throw new Error(
        `Insufficient stock. Only ${previousStock} unit${previousStock === 1 ? "" : "s"} available.`
      );
    }
    if (newStock < 0) newStock = 0;

    transaction.update(productRef, {
      currentStock: newStock,
      updatedAt: serverTimestamp(),
    });

    const movementId = nanoid();
    const movementRef = doc(
      db,
      "businesses",
      businessId,
      "stockMovements",
      movementId
    );
    transaction.set(movementRef, {
      productId,
      productName: product.name || "",
      type,
      quantity: Math.abs(quantity),
      previousStock,
      newStock,
      difference: newStock - previousStock,
      reason: reason || "",
      userId: userId || "",
      userName: userName || "",
      locationId: locationId || null,
      referenceId: referenceId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logRef = doc(db, "businesses", businessId, "activityLogs", nanoid());
    transaction.set(logRef, {
      userId: userId || "",
      userName: userName || "",
      action: quantity > 0 ? "STOCK_IN" : "STOCK_OUT",
      resource: "products",
      resourceId: productId,
      description: `${product.name}: ${quantity > 0 ? "+" : ""}${quantity} units (${
        reason || (quantity > 0 ? "Stock in" : "Stock out")
      })`,
      createdAt: serverTimestamp(),
    });

    return { previousStock, newStock, movementId };
  });
}

/**
 * Stock adjustment: user enters actual stock, we record previous vs actual.
 */
export async function adjustStock(businessId, {
  productId,
  actualStock,
  reason = "",
  userId = "",
  userName = "",
  allowNegative = false,
}) {
  if (!businessId) throw new Error("No business context");
  if (actualStock == null) throw new Error("Actual stock is required");

  const productRef = doc(db, "businesses", businessId, "products", productId);

  return runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) throw new Error("Product not found");
    const product = productSnap.data();

    const previousStock = Number(product.currentStock || 0);
    let newStock = Number(actualStock);
    if (newStock < 0 && !allowNegative) {
      throw new Error("Stock cannot be negative");
    }
    if (newStock < 0) newStock = 0;

    transaction.update(productRef, {
      currentStock: newStock,
      updatedAt: serverTimestamp(),
    });

    const movementId = nanoid();
    const movementRef = doc(
      db,
      "businesses",
      businessId,
      "stockMovements",
      movementId
    );
    transaction.set(movementRef, {
      productId,
      productName: product.name || "",
      type: MOVEMENT_TYPES.ADJUSTMENT,
      quantity: Math.abs(newStock - previousStock),
      previousStock,
      newStock,
      difference: newStock - previousStock,
      reason: reason || `Adjusted from ${previousStock} to ${newStock}`,
      userId: userId || "",
      userName: userName || "",
      locationId: null,
      referenceId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logRef = doc(db, "businesses", businessId, "activityLogs", nanoid());
    transaction.set(logRef, {
      userId: userId || "",
      userName: userName || "",
      action: "ADJUST_STOCK",
      resource: "products",
      resourceId: productId,
      description: `${product.name}: stock adjusted from ${previousStock} to ${newStock}`,
      createdAt: serverTimestamp(),
    });

    return { previousStock, newStock, movementId };
  });
}