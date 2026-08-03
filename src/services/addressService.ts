import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  building?: string;
  street?: string;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode?: string;
  postalCode?: string;
  country?: string;
  landmark?: string;
  type?: "home" | "work" | "other";
  isDefault?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Sanitizes an address object before saving to Firestore.
 * Removes any properties that equal `undefined` to prevent Firestore write errors.
 */
export const sanitizeAddress = (data: Record<string, any>): Record<string, any> => {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = typeof value === "string" ? value.trim() : value;
    }
  }
  return clean;
};

/**
 * Fetches all saved addresses for a specific customer.
 */
export const getCustomerAddresses = async (userId: string): Promise<Address[]> => {
  if (!userId) {
    console.warn("[AddressService] getCustomerAddresses called without userId.");
    return [];
  }

  try {
    const colRef = collection(db, "users", userId, "addresses");
    const snap = await getDocs(colRef);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Address));

    // Sort in memory by createdAt descending to avoid composite index requirements
    docs.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    return docs;
  } catch (error: any) {
    console.error(`[AddressService] Error fetching addresses for user (${userId}):`, error?.code, error?.message, error);
    throw error;
  }
};

/**
 * Adds a new address for a customer.
 */
export const addCustomerAddress = async (
  userId: string,
  address: Omit<Address, "id">
): Promise<string> => {
  if (!userId) {
    throw new Error("Authentication required: Cannot save address without logged-in user ID.");
  }

  const colRef = collection(db, "users", userId, "addresses");

  // Fetch existing addresses safely
  let existing: Address[] = [];
  try {
    existing = await getCustomerAddresses(userId);
  } catch (fetchErr) {
    console.warn("[AddressService] Could not fetch existing addresses prior to add:", fetchErr);
  }

  const shouldBeDefault = address.isDefault || existing.length === 0;

  // Unset previous defaults if this new address is default
  if (shouldBeDefault && existing.length > 0) {
    for (const addr of existing) {
      if (addr.id && addr.isDefault) {
        try {
          await updateDoc(doc(db, "users", userId, "addresses", addr.id), { isDefault: false });
        } catch (updateErr) {
          console.warn(`[AddressService] Failed to unset default on previous address (${addr.id}):`, updateErr);
        }
      }
    }
  }

  // Normalize address fields for complete backward & forward compatibility
  const rawPayload = {
    fullName: address.fullName || "",
    phone: address.phone || "",
    building: address.building || address.addressLine1 || "",
    street: address.street || address.addressLine2 || "",
    addressLine1: address.addressLine1 || address.building || "",
    addressLine2: address.addressLine2 || address.street || "",
    city: address.city || "",
    state: address.state || "",
    pinCode: address.pinCode || address.postalCode || "",
    postalCode: address.postalCode || address.pinCode || "",
    country: address.country || "India",
    landmark: address.landmark || "",
    type: address.type || "home",
    isDefault: Boolean(shouldBeDefault),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const payload = sanitizeAddress(rawPayload);
  console.log(`[AddressService] Saving address to path "users/${userId}/addresses":`, payload);

  const docRef = await addDoc(colRef, payload);
  console.log(`[AddressService] Address document created successfully with ID: ${docRef.id}`);
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
  if (!userId || !addressId) {
    throw new Error("Invalid address update parameters.");
  }

  const addrRef = doc(db, "users", userId, "addresses", addressId);

  if (data.isDefault) {
    try {
      const existing = await getCustomerAddresses(userId);
      for (const addr of existing) {
        if (addr.id && addr.id !== addressId && addr.isDefault) {
          await updateDoc(doc(db, "users", userId, "addresses", addr.id), { isDefault: false });
        }
      }
    } catch (err) {
      console.warn("[AddressService] Failed unsetting other default addresses during update:", err);
    }
  }

  const sanitized = sanitizeAddress({
    ...data,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(addrRef, sanitized);
};

/**
 * Deletes an address document.
 */
export const deleteCustomerAddress = async (userId: string, addressId: string): Promise<void> => {
  if (!userId || !addressId) return;
  await deleteDoc(doc(db, "users", userId, "addresses", addressId));
};

/**
 * Sets a specific address as default and unsets all others.
 */
export const setDefaultCustomerAddress = async (userId: string, addressId: string): Promise<void> => {
  if (!userId || !addressId) return;
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
