import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { nanoid } from "./utils";

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

export async function getDocument(collectionName, id) {
  const snap = await getDoc(doc(db, collectionName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createDocument(collectionName, data, id) {
  const docId = id || nanoid();
  await setDoc(doc(db, collectionName, docId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docId;
}

export async function updateDocument(collectionName, id, data) {
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}

export async function listByQuery(collectionName, clauses = []) {
  let q = collection(db, collectionName);
  const constraints = [];
  for (const [type, ...args] of clauses) {
    if (type === "where") constraints.push(where(...args));
    if (type === "orderBy") constraints.push(orderBy(...args));
    if (type === "limit") constraints.push(limit(...args));
  }
  if (constraints.length) q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  return getDocument("users", uid);
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