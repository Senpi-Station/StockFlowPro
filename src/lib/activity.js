import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { nanoid } from "./utils";
import { listSubcollection } from "./firestore";

export const ACTIVITY_ACTIONS = {
  COMPLETED_SALE: "Completed sale",
  CREATE_PURCHASE: "Created purchase",
  RECEIVE_PURCHASE: "Received purchase",
  CANCEL_PURCHASE: "Cancelled purchase",
  PROCESS_RETURN: "Processed return",
  CREATE_TRANSFER: "Transferred stock",
  STOCK_IN: "Stock in",
  STOCK_OUT: "Stock out",
  ADJUST_STOCK: "Adjusted stock",
  CREATE_PRODUCT: "Created product",
  UPDATE_PRODUCT: "Updated product",
  ARCHIVE_PRODUCT: "Archived product",
};

/**
 * Append a single activity log entry.
 */
export async function logActivity(businessId, {
  userId = "",
  userName = "",
  action,
  resource = "",
  resourceId = "",
  description = "",
}) {
  if (!businessId) throw new Error("No business context");
  const id = nanoid();
  await setDoc(doc(db, "businesses", businessId, "activityLogs", id), {
    userId,
    userName,
    action,
    resource,
    resourceId,
    description,
    createdAt: serverTimestamp(),
  });
  return id;
}

/**
 * List activity logs, newest first. Filtering by action is done client-side
 * to avoid requiring extra composite indexes.
 */
export async function getActivityLogs(businessId, max = 300) {
  if (!businessId) return [];
  return listSubcollection(businessId, "activityLogs", "createdAt", "desc", max);
}