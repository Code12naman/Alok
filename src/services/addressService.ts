import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  building: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  landmark?: string;
  isDefault?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Fetches all saved addresses for a customer.
 */
export const getCustomerAddresses = async (userId: string): Promise<Address[]> => {
  try {
    const colRef = collection(db, "users", userId, "addresses");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Address));
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return [];
  }
};

/**
 * Adds a new address for a customer.
 */
export const addCustomerAddress = async (
  userId: string,
  address: Omit<Address, "id">
): Promise<string> => {
  const colRef = collection(db, "users", userId, "addresses");

  // If this is set as default or first address, update previous defaults
  const existing = await getCustomerAddresses(userId);
  const shouldBeDefault = address.isDefault || existing.length === 0;

  if (shouldBeDefault) {
    for (const addr of existing) {
      if (addr.id && addr.isDefault) {
        await updateDoc(doc(db, "users", userId, "addresses", addr.id), { isDefault: false });
      }
    }
  }

  const payload = {
    ...address,
    isDefault: shouldBeDefault,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(colRef, payload);
  return docRef.id;
};

/**
 * Updates an existing address.
 */
export const updateCustomerAddress = async (
  userId: string,
  addressId: string,
  data: Partial<Address>
): Promise<void> => {
  const addrRef = doc(db, "users", userId, "addresses", addressId);

  if (data.isDefault) {
    const existing = await getCustomerAddresses(userId);
    for (const addr of existing) {
      if (addr.id && addr.id !== addressId && addr.isDefault) {
        await updateDoc(doc(db, "users", userId, "addresses", addr.id), { isDefault: false });
      }
    }
  }

  await updateDoc(addrRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Deletes an address.
 */
export const deleteCustomerAddress = async (userId: string, addressId: string): Promise<void> => {
  await deleteDoc(doc(db, "users", userId, "addresses", addressId));
};

/**
 * Sets an address as default.
 */
export const setDefaultCustomerAddress = async (userId: string, addressId: string): Promise<void> => {
  const existing = await getCustomerAddresses(userId);
  for (const addr of existing) {
    if (addr.id) {
      await updateDoc(doc(db, "users", userId, "addresses", addr.id), {
        isDefault: addr.id === addressId,
        updatedAt: serverTimestamp(),
      });
    }
  }
};
