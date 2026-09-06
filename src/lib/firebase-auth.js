import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { nanoid } from "./utils";

const googleProvider = new GoogleAuthProvider();

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentAuthUser() {
  return auth.currentUser;
}

export async function loginWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: translateAuthError(error.code) };
  }
}

export async function loginWithGoogle() {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: translateAuthError(error.code) };
  }
}

export async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: translateAuthError(error.code) };
  }
}

export async function logout() {
  await signOut(auth);
}

/**
 * Registration flow:
 * 1. Create Firebase user
 * 2. Create business document
 * 3. Create user profile
 * 4. Assign the first user as admin
 * 5. Connect user to business
 */
export async function registerWithEmail({ fullName, businessName, email, password }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    const uid = firebaseUser.uid;
    const businessId = nanoid();

    await setDoc(doc(db, "businesses", businessId), {
      name: businessName,
      ownerId: uid,
      email,
      currency: "USD",
      timezone: "UTC",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Assign the first user as admin (business member)
    await setDoc(doc(db, "businesses", businessId, "members", uid), {
      userId: uid,
      role: "ADMIN",
      joinedAt: serverTimestamp(),
    });

    // Create user profile and connect to business
    await setDoc(doc(db, "users", uid), {
      fullName,
      email,
      businessId,
      role: "ADMIN",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { user: firebaseUser, businessId, error: null };
  } catch (error) {
    return { user: null, businessId: null, error: translateAuthError(error.code) };
  }
}

export function translateAuthError(code) {
  const messages = {
    "auth/email-already-in-use": "This email is already registered. Try logging in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase.",
  };
  return messages[code] || "Something went wrong. Please try again.";
}