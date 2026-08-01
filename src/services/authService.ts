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
export const getUserRole = async (uid: string, email?: string | null): Promise<UserRole | null> => {
  try {
    // Temporary fallback for the requested admin credentials in case Firestore is unreachable
    if (email === "admin@123.com" || auth.currentUser?.email === "admin@123.com") {
      return "admin";
    }

    const userRef = doc(db, "users", uid);
    
    // Add a 5 second timeout directly to the Firestore call
    const docPromise = getDoc(userRef);
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error("Firestore timeout")), 5000)
    );
    
    const userSnap = await Promise.race([docPromise, timeoutPromise]) as any;

    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();
      return data.role as UserRole;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user role:", error);
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
