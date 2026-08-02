import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const googleProvider = new GoogleAuthProvider();

export type UserRole = "admin" | "customer";

export interface UserData {
  uid: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  customerId?: string;
  role: UserRole;
  createdAt?: any;
}

export function generateCustomerId(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `STU-${random}`;
}

/**
 * Checks if a user document exists in Firestore. If not, creates one with a default role and customerId.
 */
export const checkAndCreateUserDoc = async (
  user: User,
  role: UserRole = "customer",
  extraData: { name?: string; phone?: string } = {}
): Promise<UserData> => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const customerId = generateCustomerId();
    const userData: UserData = {
      uid: user.uid,
      name: extraData.name || user.displayName || "",
      email: user.email,
      phone: extraData.phone || user.phoneNumber || "",
      customerId,
      role: role,
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, userData);
    return userData;
  }

  return userSnap.data() as UserData;
};

/**
 * Registers a new customer with email/password, full name, phone number, and STU-XXXXXX customerId.
 */
export const signUpCustomer = async (
  email: string,
  pass: string,
  name: string,
  phone: string
): Promise<UserData> => {
  const res = await createUserWithEmailAndPassword(auth, email, pass);
  const customerId = generateCustomerId();
  const userData: UserData = {
    uid: res.user.uid,
    name,
    email,
    phone,
    customerId,
    role: "customer",
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", res.user.uid), userData);
  return userData;
};

/**
 * Signs in an existing customer with email/password.
 */
export const signInCustomer = async (email: string, pass: string) => {
  return await signInWithEmailAndPassword(auth, email, pass);
};

/**
 * Signs in or registers via Google popup.
 */
export const signInWithGoogle = async (): Promise<UserData> => {
  const res = await signInWithPopup(auth, googleProvider);
  return await checkAndCreateUserDoc(res.user, "customer");
};

/**
 * Sends a password reset link to user's email.
 */
export const sendPasswordResetLink = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * Fetches full UserData from Firestore.
 */
export const getUserProfile = async (uid: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

/**
 * Fetches the user role from Firestore.
 */
export const getUserRole = async (uid: string): Promise<UserRole | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return (data.role as UserRole) || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user role from Firestore:", error);
    return null;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
