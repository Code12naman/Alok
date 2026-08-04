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
  imagePublicId?: string;
  active: boolean;
  sortOrder?: number;
  createdAt?: any;
  updatedAt?: any;
}

export const DEFAULT_MAIN_CATEGORIES: FirestoreCategory[] = [
  {
    name: "Men",
    slug: "men",
    description: "Men's fashion, apparel & streetwear",
    image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80&w=800",
    active: true,
    sortOrder: 1,
  },
  {
    name: "Women",
    slug: "women",
    description: "Women's fashion, apparel & footwear",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800",
    active: true,
    sortOrder: 2,
  },
  {
    name: "Kids",
    slug: "kids",
    description: "Kids' clothing & wear",
    image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=800",
    active: true,
    sortOrder: 3,
  },
  {
    name: "Shoes",
    slug: "shoes",
    description: "Sneakers, boots & casual footwear",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800",
    active: true,
    sortOrder: 4,
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Watches, bags, belts & lifestyle accessories",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
    active: true,
    sortOrder: 5,
  },
  {
    name: "Others",
    slug: "others",
    description: "Other premium lifestyle & fashion products",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800",
    active: true,
    sortOrder: 6,
  },
];

export function toCategorySlug(name: string): string {
  return (name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function sanitizeCategoryPayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null && val !== "") {
      clean[key] = val;
    } else if (key === "active") {
      clean[key] = Boolean(val);
    } else if (key === "sortOrder") {
      clean[key] = Number(val) || 99;
    }
  }
  return clean as Partial<T>;
}

export const getCategories = async (): Promise<FirestoreCategory[]> => {
  try {
    const snap = await getDocs(collection(db, COL));
    const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreCategory));

    const obsoleteNames = ["Electronics", "Beauty", "Home Decor", "Fashion"];
    const validFetched = fetched.filter((c) => !obsoleteNames.includes(c.name));

    const uniqueMap = new Map<string, FirestoreCategory>();
    for (const cat of validFetched) {
      const slugKey = (cat.slug || toCategorySlug(cat.name)).trim().toLowerCase();
      if (!uniqueMap.has(slugKey)) {
        uniqueMap.set(slugKey, cat);
      }
    }

    const uniqueCategories = Array.from(uniqueMap.values());

    uniqueCategories.sort((a, b) => {
      const orderA = a.sortOrder ?? 99;
      const orderB = b.sortOrder ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    return uniqueCategories;
  } catch (err) {
    console.warn("[CategoryService] Could not fetch categories from Firestore, using defaults:", err);
    return DEFAULT_MAIN_CATEGORIES;
  }
};

export const addCategory = async (cat: Omit<FirestoreCategory, "id">): Promise<string> => {
  if (!cat.name || !cat.name.trim()) {
    throw new Error("Category name is required.");
  }

  const name = cat.name.trim();
  const slug = cat.slug ? toCategorySlug(cat.slug) : toCategorySlug(name);

  const existing = await getCategories();
  const duplicate = existing.find(
    (c) =>
      (c.slug || toCategorySlug(c.name)).toLowerCase() === slug.toLowerCase() ||
      c.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    throw new Error(`Category "${name}" already exists.`);
  }

  const maxSortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0);

  const payload = sanitizeCategoryPayload({
    name,
    slug,
    description: cat.description?.trim(),
    image: cat.image,
    imagePublicId: cat.imagePublicId,
    active: cat.active ?? true,
    sortOrder: cat.sortOrder || maxSortOrder + 1,
  });

  const docRef = await addDoc(collection(db, COL), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const updateCategory = async (id: string, data: Partial<FirestoreCategory>): Promise<void> => {
  const payload = sanitizeCategoryPayload({
    ...data,
    name: data.name?.trim(),
    slug: data.slug ? toCategorySlug(data.slug) : data.name ? toCategorySlug(data.name) : undefined,
    description: data.description?.trim(),
    imagePublicId: data.imagePublicId,
  });

  await updateDoc(doc(db, COL, id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
};

export const deleteCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COL, id));
};
