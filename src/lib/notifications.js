import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { nanoid } from "./utils";
import { getStockStatus } from "./calculations";

export const NOTIFICATION_TYPES = {
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  NEW_SALE: "NEW_SALE",
  NEW_PURCHASE: "NEW_PURCHASE",
  TRANSFER: "TRANSFER",
  RETURN: "RETURN",
  SYSTEM: "SYSTEM",
};

export const DEFAULT_PREFS = {
  LOW_STOCK: true,
  OUT_OF_STOCK: true,
  NEW_SALE: true,
  NEW_PURCHASE: true,
  TRANSFER: true,
  RETURN: true,
  SYSTEM: true,
};

export const NOTIFICATION_TYPE_LABELS = {
  LOW_STOCK: "Low stock alerts",
  OUT_OF_STOCK: "Out of stock alerts",
  NEW_SALE: "New sales",
  NEW_PURCHASE: "New purchases",
  TRANSFER: "Stock transfers",
  RETURN: "Returns",
  SYSTEM: "System updates",
};

/**
 * List the most recent notifications for a business.
 */
export async function listNotifications(businessId, max = 100) {
  const q = query(
    collection(db, "businesses", businessId, "notifications"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Create a business-wide notification. Read state is tracked per user in the
 * `readBy` map ({ [userId]: true }).
 */
export async function createNotification(businessId, {
  type,
  title,
  message,
  productId = null,
  referenceId = null,
}) {
  if (!businessId) throw new Error("No business context");
  const id = nanoid();
  await setDoc(doc(db, "businesses", businessId, "notifications", id), {
    type,
    title,
    message: message || "",
    productId,
    referenceId,
    readBy: {},
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function markNotificationRead(businessId, id, userId) {
  if (!userId) return;
  await updateDoc(doc(db, "businesses", businessId, "notifications", id), {
    [`readBy.${userId}`]: true,
  });
}

export async function markAllNotificationsRead(businessId, notifications, userId) {
  if (!userId) return;
  const unread = notifications.filter((n) => !n.readBy?.[userId]);
  await Promise.all(unread.map((n) => markNotificationRead(businessId, n.id, userId)));
}

export async function deleteNotification(businessId, id) {
  await deleteDoc(doc(db, "businesses", businessId, "notifications", id));
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

export async function getNotificationPreferences(businessId, userId) {
  if (!userId) return DEFAULT_PREFS;
  const snap = await getDoc(
    doc(db, "businesses", businessId, "notificationPreferences", userId)
  );
  if (!snap.exists()) return { ...DEFAULT_PREFS };
  return { ...DEFAULT_PREFS, ...snap.data() };
}

export async function saveNotificationPreferences(businessId, userId, prefs) {
  if (!userId) throw new Error("No user context");
  await setDoc(doc(db, "businesses", businessId, "notificationPreferences", userId), prefs);
}

/**
 * Fire-and-forget event notification that respects the user's preferences.
 * Never throws — used at the end of transactional workflows.
 */
export async function notifyEvent(businessId, { type, title, message, productId = null, referenceId = null, userId = null }) {
  try {
    if (userId) {
      const prefs = await getNotificationPreferences(businessId, userId);
      if (prefs[type] === false) return;
    }
    await createNotification(businessId, { type, title, message, productId, referenceId });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Generate LOW_STOCK / OUT_OF_STOCK notifications for products that have no
 * existing unread notification of the same kind (dedupe by type + productId).
 */
export async function syncStockNotifications(businessId, products = [], userId = "") {
  if (!businessId) return;
  try {
    const prefs = await getNotificationPreferences(businessId, userId);
    const existing = await listNotifications(businessId, 200);
    const seen = new Set();
    for (const n of existing) {
      if (n.type && n.productId) seen.add(`${n.type}:${n.productId}`);
    }
    const ops = [];
    for (const p of products) {
      if (p.status === "ARCHIVED") continue;
      const stock = Number(p.currentStock || 0);
      const minimum = Number(p.minimumStock || 0);
      const status = getStockStatus(stock, minimum);
      let type = null;
      let title = "";
      let message = "";
      if (status === "OUT_OF_STOCK") {
        type = NOTIFICATION_TYPES.OUT_OF_STOCK;
        title = `${p.name} is out of stock`;
        message = `No units in stock. Time to reorder.`;
      } else if (status === "LOW_STOCK") {
        type = NOTIFICATION_TYPES.LOW_STOCK;
        title = `${p.name} is running low`;
        message = `${stock} unit${stock === 1 ? "" : "s"} left (minimum ${minimum}).`;
      }
      if (!type) continue;
      if (prefs[type] === false) continue;
      if (seen.has(`${type}:${p.id}`)) continue;
      ops.push(createNotification(businessId, { type, title, message, productId: p.id }));
    }
    await Promise.all(ops);
  } catch (error) {
    console.error("Failed to sync stock notifications:", error);
  }
}