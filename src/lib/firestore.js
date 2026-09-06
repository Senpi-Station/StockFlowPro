import {
  collection,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { nanoid } from "./utils";

// ---------------------------------------------------------------------------
// Generic subcollection helpers (business-scoped)
// ---------------------------------------------------------------------------

export function businessCol(businessId, sub) {
  return collection(db, "businesses", businessId, sub);
}

export function businessDoc(businessId, sub, id) {
  return doc(db, "businesses", businessId, sub, id);
}

/**
 * Get all docs in a subcollection with optional order.
 */
export async function listSubcollection(businessId, sub, orderField = "createdAt", direction = "desc", max = null) {
  let q = query(businessCol(businessId, sub), orderBy(orderField, direction));
  if (max) q = query(q, limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get docs filtered by a single field with order + optional limit.
 */
export async function listWhere(businessId, sub, field, operator, value, orderField = "createdAt", direction = "desc", max = null) {
  let q = query(businessCol(businessId, sub), where(field, operator, value), orderBy(orderField, direction));
  if (max) q = query(q, limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Create a document in a subcollection.
 */
export async function createInSubcollection(businessId, sub, data, id = null) {
  const docId = id || nanoid();
  await setDoc(businessDoc(businessId, sub, docId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docId;
}

/**
 * Update a document in a subcollection.
 */
export async function updateInSubcollection(businessId, sub, id, data) {
  await updateDoc(businessDoc(businessId, sub, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a document in a subcollection.
 */
export async function deleteInSubcollection(businessId, sub, id) {
  await deleteDoc(businessDoc(businessId, sub, id));
}

/**
 * Get a single document from a subcollection.
 */
export async function getFromSubcollection(businessId, sub, id) {
  const snap = await getDoc(businessDoc(businessId, sub, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------------------------------------------------------------------------
// Business helpers
// ---------------------------------------------------------------------------

export async function getBusiness(businessId) {
  const snap = await getDoc(doc(db, "businesses", businessId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateBusiness(businessId, data) {
  await updateDoc(doc(db, "businesses", businessId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// User / member helpers
// ---------------------------------------------------------------------------

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getUserRole(businessId, uid) {
  const snap = await getDoc(doc(db, "businesses", businessId, "members", uid));
  return snap.exists() ? snap.data().role || "STAFF" : null;
}