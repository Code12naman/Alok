import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const googleProvider = new GoogleAuthProvider();

export type UserRole = "admin" | "customer";

export interface UserData {
  uid: string;
  name: string | null;
  email: string | null;
  role: UserRole;
}

/**
 * Checks if a user document exists in Firestore. If not, creates one with a default role.
 */
export const checkAndCreateUserDoc = async (
  user: User,
  role: UserRole = "customer"
): Promise<UserData> => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const userData: UserData = {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email,
      role: role,
    };
    await setDoc(userRef, userData);
    return userData;
  }

  return userSnap.data() as UserData;
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
