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

export const DEFAULT_MAIN_CATEGORIES: FirestoreCategory[] = [
  {
    name: "Men",
    slug: "men",
    description: "Men's fashion, apparel & streetwear",
    image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80&w=800",
    active: true,
  },
  {
    name: "Women",
    slug: "women",
    description: "Women's fashion, apparel & footwear",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800",
    active: true,
  },
  {
    name: "Kids",
    slug: "kids",
    description: "Kids' clothing & wear",
    image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=800",
    active: true,
  },
  {
    name: "Shoes",
    slug: "shoes",
    description: "Sneakers, boots & casual footwear",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800",
    active: true,
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Watches, bags, belts & lifestyle accessories",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
    active: true,
  },
  {
    name: "Others",
    slug: "others",
    description: "Other premium lifestyle & fashion products",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800",
    active: true,
  },
];

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
  try {
    const snap = await getDocs(query(collection(db, COL), orderBy("name", "asc")));
    const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreCategory));

    // Filter out obsolete legacy categories from active shopping lists
    const obsoleteNames = ["Electronics", "Beauty", "Home Decor", "Fashion"];
    const validFetched = fetched.filter((c) => !obsoleteNames.includes(c.name));

    if (validFetched.length > 0) {
      return validFetched;
    }
    return DEFAULT_MAIN_CATEGORIES;
  } catch (err) {
    console.warn("[CategoryService] Could not fetch categories from Firestore, using defaults:", err);
    return DEFAULT_MAIN_CATEGORIES;
  }
};

export const updateCategory = async (id: string, data: Partial<FirestoreCategory>): Promise<void> => {
  await updateDoc(doc(db, COL, id), data);
};

export const deleteCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COL, id));
};
