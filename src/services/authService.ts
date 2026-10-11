import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const googleProvider = new GoogleAuthProvider();

export type UserRole = "admin" | "customer";

export interface UserData {
  uid: string;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  customerId?: string;
  role: UserRole;
  createdAt?: unknown;
}

export function generateCustomerId(uid: string): string {
  if (!uid) {
    throw new Error("An authenticated Firebase UID is required to generate a customer ID.");
  }
  return customerIdForUid(uid);
}

function customerIdForUid(uid: string): string {
  return `CT-CUS-${uid.toUpperCase()}`;
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
    const customerId = generateCustomerId(user.uid);
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

  const existing = userSnap.data() as UserData;
  if (!existing.customerId) {
    const customerId = generateCustomerId(user.uid);
    await updateDoc(userRef, { customerId });
    return { ...existing, customerId };
  }
  return existing;
};

/**
 * Registers a new customer with email/password and a permanent UID-derived customer ID.
 */
export interface CustomerRegistration {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  dateOfBirth?: string;
}

export const signUpCustomer = async ({
  firstName,
  lastName,
  email,
  password,
  phone,
  dateOfBirth,
}: CustomerRegistration): Promise<UserData> => {
  const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  const customerId = generateCustomerId(res.user.uid);
  const userData: UserData = {
    uid: res.user.uid,
    name,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: res.user.email,
    phone: phone.trim(),
    dateOfBirth: dateOfBirth?.trim() || null,
    customerId,
    role: "customer",
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", res.user.uid), userData);
  return userData;
};

export const updateCustomerProfile = async (
  uid: string,
  data: Pick<UserData, "firstName" | "lastName" | "phone" | "dateOfBirth">
): Promise<void> => {
  if (!uid) throw new Error("Authentication required to update a profile.");
  const firstName = data.firstName?.trim() || "";
  const lastName = data.lastName?.trim() || "";
  if (!firstName || !lastName || !data.phone?.trim()) {
    throw new Error("First name, last name, and phone number are required.");
  }
  await updateDoc(doc(db, "users", uid), {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    phone: data.phone.trim(),
    dateOfBirth: data.dateOfBirth?.trim() || null,
  });
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
