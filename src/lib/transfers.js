import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { nanoid } from "./utils";
import { MOVEMENT_TYPES } from "./inventory";
import { notifyEvent } from "./notifications";

export const TRANSFER_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const TRANSFER_STATUS_LABELS = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * Transfer stock from one location to another.
 * - Reduces the source location stock
 * - Increases the destination location stock
 * - Recomputes the aggregate currentStock (unchanged total)
 * - Records TRANSFER_OUT + TRANSFER_IN movements and the transfer doc
 */
export async function createTransfer(businessId, {
  fromLocationId,
  toLocationId,
  productId,
  quantity,
  note = "",
  userId = "",
  userName = "",
}) {
  if (!businessId) throw new Error("No business context");
  if (!fromLocationId || !toLocationId) throw new Error("Select source and destination");
  if (fromLocationId === toLocationId) throw new Error("Source and destination must differ");
  if (!productId) throw new Error("Select a product");
  const qty = Number(quantity || 0);
  if (qty <= 0) throw new Error("Quantity must be greater than zero");

  const transferId = nanoid();
  const transferRef = doc(db, "businesses", businessId, "transfers", transferId);
  const productRef = doc(db, "businesses", businessId, "products", productId);

  const result = await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) throw new Error("Product not found");
    const product = productSnap.data();

    // Initialize per-location stock if it has never been set up.
    let locationStock = product.locationStock;
    if (!locationStock || typeof locationStock !== "object") {
      locationStock = { [fromLocationId]: Number(product.currentStock || 0) };
    }
    const sourceStock = Number(locationStock[fromLocationId] || 0);
    if (sourceStock < qty) {
      throw new Error(
        `Insufficient stock at source. Only ${sourceStock} unit${sourceStock === 1 ? "" : "s"} available.`
      );
    }

    const newLocationStock = {
      ...locationStock,
      [fromLocationId]: sourceStock - qty,
      [toLocationId]: Number(locationStock[toLocationId] || 0) + qty,
    };

    // Aggregate stays the same after a transfer.
    const total = Object.values(newLocationStock).reduce((s, v) => s + Number(v || 0), 0);

    transaction.update(productRef, {
      locationStock: newLocationStock,
      currentStock: total,
      updatedAt: serverTimestamp(),
    });

    transaction.set(transferRef, {
      fromLocationId,
      toLocationId,
      productId,
      productName: product.name || "",
      sku: product.sku || "",
      quantity: qty,
      status: TRANSFER_STATUS.COMPLETED,
      note: note || "",
      userId: userId || "",
      userName: userName || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Audit movements for both locations
    const fromMovementRef = doc(db, "businesses", businessId, "stockMovements", nanoid());
    transaction.set(fromMovementRef, {
      productId,
      productName: product.name || "",
      type: MOVEMENT_TYPES.TRANSFER_OUT,
      quantity: qty,
      previousStock: sourceStock,
      newStock: sourceStock - qty,
      difference: -qty,
      reason: "Transferred to another location",
      userId: userId || "",
      userName: userName || "",
      locationId: fromLocationId,
      referenceId: transferId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const toMovementRef = doc(db, "businesses", businessId, "stockMovements", nanoid());
    transaction.set(toMovementRef, {
      productId,
      productName: product.name || "",
      type: MOVEMENT_TYPES.TRANSFER_IN,
      quantity: qty,
      previousStock: Number(locationStock[toLocationId] || 0),
      newStock: Number(locationStock[toLocationId] || 0) + qty,
      difference: qty,
      reason: "Received from another location",
      userId: userId || "",
      userName: userName || "",
      locationId: toLocationId,
      referenceId: transferId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logRef = doc(db, "businesses", businessId, "activityLogs", nanoid());
    transaction.set(logRef, {
      userId: userId || "",
      userName: userName || "",
      action: "CREATE_TRANSFER",
      resource: "transfers",
      resourceId: transferId,
      description: `Transferred ${qty} units of ${product.name || ""}`,
      createdAt: serverTimestamp(),
    });

    return { transferId };
  });

  notifyEvent(businessId, {
    type: "TRANSFER",
    title: "Stock transfer completed",
    message: `${qty} units moved between locations`,
    productId,
    referenceId: result.transferId,
    userId,
  });

  return result;
}