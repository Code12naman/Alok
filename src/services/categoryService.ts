import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

const COL = "categories";

export interface FirestoreCategory {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  active: boolean;
  createdAt?: any;
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const addCategory = async (cat: Omit<FirestoreCategory, "id">): Promise<string> => {
  const docRef = await addDoc(collection(db, COL), {
    ...cat,
    slug: cat.slug || toSlug(cat.name),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getCategories = async (): Promise<FirestoreCategory[]> => {
  const snap = await getDocs(query(collection(db, COL), orderBy("name", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreCategory));
};

export const updateCategory = async (id: string, data: Partial<FirestoreCategory>): Promise<void> => {
  await updateDoc(doc(db, COL, id), data);
};

export const deleteCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COL, id));
};
