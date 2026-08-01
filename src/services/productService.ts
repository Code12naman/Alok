import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";
import { db } from "../firebase/config";

const COL = "products";

export interface FirestoreProduct {
  id?: string;
  name: string;
  slug: string;
  sku?: string;
  shortDescription?: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  price: number;
  compareAtPrice?: number;
  discountPercentage?: number;
  stock: number;
  sizes?: string[];
  colors?: string[];
  material?: string;
  fit?: string;
  careInstructions?: string;
  images: string[];
  thumbnail?: string;
  video?: string;
  tags?: string[];
  status: "draft" | "active" | "out_of_stock";
  featured: boolean;
  newArrival: boolean;
  trending: boolean;
  bestSeller: boolean;
  limitedDrop: boolean;
  createdAt?: any;
  updatedAt?: any;
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const addProduct = async (product: Omit<FirestoreProduct, "id">): Promise<string> => {
  const docRef = await addDoc(collection(db, COL), {
    ...product,
    slug: product.slug || toSlug(product.name),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getProducts = async (): Promise<FirestoreProduct[]> => {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreProduct));
};

export const getActiveProducts = async (): Promise<FirestoreProduct[]> => {
  const snap = await getDocs(query(collection(db, COL), where("status", "==", "active"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreProduct));
};

export const getProductById = async (id: string): Promise<FirestoreProduct | null> => {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FirestoreProduct;
};

export const getProductBySlug = async (slug: string): Promise<FirestoreProduct | null> => {
  const snap = await getDocs(query(collection(db, COL), where("slug", "==", slug)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as FirestoreProduct;
};

export const getProductsByCategory = async (category: string): Promise<FirestoreProduct[]> => {
  const snap = await getDocs(query(collection(db, COL), where("category", "==", category), where("status", "==", "active")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreProduct));
};

export const getFeaturedProducts = async (): Promise<FirestoreProduct[]> => {
  const snap = await getDocs(query(collection(db, COL), where("featured", "==", true), where("status", "==", "active")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreProduct));
};

export const getNewArrivals = async (): Promise<FirestoreProduct[]> => {
  const snap = await getDocs(query(collection(db, COL), where("newArrival", "==", true), where("status", "==", "active")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreProduct));
};

export const getTrendingProducts = async (): Promise<FirestoreProduct[]> => {
  const snap = await getDocs(query(collection(db, COL), where("trending", "==", true), where("status", "==", "active")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreProduct));
};

export const getBestSellers = async (): Promise<FirestoreProduct[]> => {
  const snap = await getDocs(query(collection(db, COL), where("bestSeller", "==", true), where("status", "==", "active")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreProduct));
};

export const getLimitedDrops = async (): Promise<FirestoreProduct[]> => {
  const snap = await getDocs(query(collection(db, COL), where("limitedDrop", "==", true), where("status", "==", "active")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreProduct));
};

export const updateProduct = async (id: string, data: Partial<FirestoreProduct>): Promise<void> => {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteProduct = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COL, id));
};
