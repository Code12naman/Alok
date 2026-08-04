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

export interface CloudinaryImage {
  url: string;
  publicId?: string;
}

export type ProductImageItem = string | CloudinaryImage;

export function getImageUrl(img: ProductImageItem | undefined | null): string {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.url || "";
}

export function getImagePublicId(img: ProductImageItem | undefined | null): string | null {
  if (!img || typeof img === "string") return null;
  return img.publicId || null;
}

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
  images: ProductImageItem[];
  thumbnail?: string;
  video?: string;
  tags?: string[];
  status: "draft" | "active" | "out_of_stock";
  featured: boolean;
  newArrival: boolean;
  trending: boolean;
  bestSeller: boolean;
  limitedDrop: boolean;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export function toSlug(name: string): string {
  const cleaned = (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!cleaned || cleaned === "product" || cleaned === "product-") {
    return `product-${Date.now()}`;
  }
  return cleaned;
}

/**
 * Recursively strips any properties whose value is undefined from an object or array.
 * Preserves Firestore special FieldValues (like serverTimestamp()), Timestamps, and Date objects.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== "object") {
    return data;
  }

  // Preserve Firestore FieldValue, Timestamp, Date, DocumentReference instances
  if (
    data.constructor &&
    data.constructor.name !== "Object" &&
    data.constructor.name !== "Array"
  ) {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value === undefined) {
      continue; // Skip undefined properties completely so Firestore never errors
    }
    cleanObj[key] = sanitizeForFirestore(value);
  }
  return cleanObj as T;
}

/**
 * Normalizes product raw form inputs into a clean Firestore product object, ensuring
 * no optional field evaluates to undefined.
 */
export function normalizeProductData(raw: Partial<FirestoreProduct>): Omit<FirestoreProduct, "id"> {
  const name = (raw.name || "").trim();
  const slug = (raw.slug || "").trim() ? toSlug(raw.slug!) : toSlug(name);
  const sku = (raw.sku || "").trim();
  const shortDescription = (raw.shortDescription || "").trim();
  const description = (raw.description || "").trim();
  const category = (raw.category || "").trim();
  const subcategory = (raw.subcategory || "").trim();
  const brand = (raw.brand || "").trim();

  const price = typeof raw.price === "number" && !isNaN(raw.price) ? raw.price : Number(raw.price) || 0;

  let compareAtPrice: number | null = null;
  if (raw.compareAtPrice !== undefined && raw.compareAtPrice !== null && (raw.compareAtPrice as any) !== "") {
    const parsed = Number(raw.compareAtPrice);
    if (!isNaN(parsed) && parsed > 0) {
      compareAtPrice = parsed;
    }
  }

  let discountPercentage: number | null = null;
  if (raw.discountPercentage !== undefined && raw.discountPercentage !== null && (raw.discountPercentage as any) !== "") {
    const parsed = Number(raw.discountPercentage);
    if (!isNaN(parsed) && parsed >= 0) {
      discountPercentage = parsed;
    }
  } else if (compareAtPrice && compareAtPrice > price) {
    discountPercentage = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  }

  const stock = typeof raw.stock === "number" && !isNaN(raw.stock) ? raw.stock : Number(raw.stock) || 0;
  const sizes = Array.isArray(raw.sizes) ? raw.sizes.filter(Boolean) : [];
  const colors = Array.isArray(raw.colors) ? raw.colors.filter(Boolean) : [];
  const material = (raw.material || "").trim();
  const fit = (raw.fit || "").trim();
  const careInstructions = (raw.careInstructions || "").trim();
  const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];
  const thumbnail = raw.thumbnail || getImageUrl(images[0]) || "";
  const video = (raw.video || "").trim();
  const tags = Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [];
  const status = raw.status || "draft";
  const featured = Boolean(raw.featured);
  const newArrival = Boolean(raw.newArrival);
  const trending = Boolean(raw.trending);
  const bestSeller = Boolean(raw.bestSeller);
  const limitedDrop = Boolean(raw.limitedDrop);

  const payload: Omit<FirestoreProduct, "id"> = {
    name,
    slug,
    sku,
    shortDescription,
    description,
    category,
    subcategory,
    brand,
    price,
    compareAtPrice: compareAtPrice === null ? undefined : compareAtPrice,
    discountPercentage: discountPercentage === null ? undefined : discountPercentage,
    stock,
    sizes,
    colors,
    material,
    fit,
    careInstructions,
    images,
    thumbnail,
    video,
    tags,
    status,
    featured,
    newArrival,
    trending,
    bestSeller,
    limitedDrop,
  };

  return sanitizeForFirestore(payload);
}

export const addProduct = async (product: Omit<FirestoreProduct, "id">): Promise<string> => {
  const normalized = normalizeProductData(product);
  const payload = sanitizeForFirestore({
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log("PRODUCT DATA BEFORE FIRESTORE:", payload);
  const undefinedFields = Object.entries(payload)
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);
  console.log("UNDEFINED PRODUCT FIELDS:", undefinedFields);

  const docRef = await addDoc(collection(db, COL), payload);
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
  if (!id) return null;
  try {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as FirestoreProduct;
  } catch {
    return null;
  }
};

export const getProductBySlug = async (slug: string): Promise<FirestoreProduct | null> => {
  if (!slug) return null;
  try {
    const snap = await getDocs(query(collection(db, COL), where("slug", "==", slug)));
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as FirestoreProduct;
    }
  } catch (err) {
    console.warn("getProductBySlug query failed, falling back to ID:", err);
  }
  return await getProductById(slug);
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
  const sanitized = sanitizeForFirestore({
    ...data,
    updatedAt: serverTimestamp(),
  });

  console.log("UPDATE PRODUCT DATA BEFORE FIRESTORE:", sanitized);
  const undefinedFields = Object.entries(sanitized)
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);
  console.log("UNDEFINED PRODUCT FIELDS FOR UPDATE:", undefinedFields);

  await updateDoc(doc(db, COL, id), sanitized);
};

export const deleteProduct = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COL, id));
};
