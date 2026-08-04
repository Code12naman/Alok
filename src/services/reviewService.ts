import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  collectionGroup,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { deepSanitizeFirestore, formatOrderTimestamp } from "./orderService";

export { formatOrderTimestamp };

export interface ProductReview {
  id?: string;
  productId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number; // 1 to 5
  review: string;
  images?: string[];
  verifiedPurchase: boolean;
  hidden?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface AdminReview extends ProductReview {
  productName?: string;
  productSlug?: string;
}

/**
 * Checks if a specific user has purchased a specific product.
 */
export async function hasUserPurchasedProduct(
  userId: string,
  productId: string
): Promise<boolean> {
  if (!userId || !productId) return false;

  try {
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const snap = await getDocs(q);

    if (snap.empty) return false;

    for (const docSnap of snap.docs) {
      const orderData = docSnap.data();
      const items = Array.isArray(orderData.items)
        ? orderData.items
        : Array.isArray(orderData.products)
        ? orderData.products
        : [];

      const found = items.some(
        (i: any) => i.productId === productId || i.id === productId
      );

      if (found) return true;
    }
  } catch (err) {
    console.error("[ReviewService] Error checking user purchase history:", err);
  }

  return false;
}

/**
 * Recalculates average rating and review count for a product, updating the product document.
 */
export async function recalculateProductRating(
  productId: string
): Promise<{ averageRating: number; reviewCount: number }> {
  if (!productId) return { averageRating: 0, reviewCount: 0 };

  try {
    const reviewsRef = collection(db, "products", productId, "reviews");
    const snap = await getDocs(reviewsRef);

    const activeReviews = snap.docs
      .map((d) => d.data() as ProductReview)
      .filter((r) => !r.hidden);

    const reviewCount = activeReviews.length;
    let averageRating = 0;

    if (reviewCount > 0) {
      const totalStars = activeReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
      averageRating = Math.round((totalStars / reviewCount) * 10) / 10;
    }

    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      averageRating,
      reviewCount,
      updatedAt: serverTimestamp(),
    });

    return { averageRating, reviewCount };
  } catch (err) {
    console.error("[ReviewService] Error recalculating product rating:", err);
    return { averageRating: 0, reviewCount: 0 };
  }
}

/**
 * Fetches all non-hidden reviews for a given product ID.
 */
export async function getProductReviews(
  productId: string,
  sortBy: "newest" | "highest" | "lowest" = "newest"
): Promise<ProductReview[]> {
  if (!productId) return [];

  try {
    const reviewsRef = collection(db, "products", productId, "reviews");
    const snap = await getDocs(query(reviewsRef, orderBy("createdAt", "desc")));

    const reviews = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ProductReview))
      .filter((r) => !r.hidden);

    if (sortBy === "highest") {
      reviews.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "lowest") {
      reviews.sort((a, b) => a.rating - b.rating);
    }

    return reviews;
  } catch (err) {
    console.error("[ReviewService] Error fetching product reviews:", err);
    return [];
  }
}

/**
 * Creates a new product review and updates parent product average rating.
 */
export async function addReview(
  reviewData: Omit<ProductReview, "id">
): Promise<string> {
  if (!reviewData.productId) throw new Error("Product ID is required.");
  if (!reviewData.userId) throw new Error("User ID is required.");
  if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
    throw new Error("Rating must be between 1 and 5 stars.");
  }
  if (!reviewData.review || reviewData.review.trim().length < 10) {
    throw new Error("Review text must be at least 10 characters.");
  }

  const payload = deepSanitizeFirestore({
    productId: reviewData.productId,
    userId: reviewData.userId,
    userName: reviewData.userName || "Verified Customer",
    userPhoto: reviewData.userPhoto || "",
    rating: Number(reviewData.rating),
    review: reviewData.review.trim(),
    images: Array.isArray(reviewData.images) ? reviewData.images.filter(Boolean) : [],
    verifiedPurchase: true,
    hidden: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const reviewsRef = collection(db, "products", reviewData.productId, "reviews");
  const docRef = await addDoc(reviewsRef, payload);

  // Recalculate average rating & review count for parent product
  await recalculateProductRating(reviewData.productId);

  return docRef.id;
}

/**
 * Updates an existing review.
 */
export async function updateReview(
  productId: string,
  reviewId: string,
  data: Partial<ProductReview>
): Promise<void> {
  if (!productId || !reviewId) return;

  const rawPayload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof data.rating === "number") rawPayload.rating = data.rating;
  if (typeof data.review === "string") rawPayload.review = data.review.trim();
  if (Array.isArray(data.images)) rawPayload.images = data.images.filter(Boolean);

  const sanitized = deepSanitizeFirestore(rawPayload);
  const reviewRef = doc(db, "products", productId, "reviews", reviewId);
  await updateDoc(reviewRef, sanitized);

  await recalculateProductRating(productId);
}

/**
 * Deletes a review.
 */
export async function deleteReview(
  productId: string,
  reviewId: string
): Promise<void> {
  if (!productId || !reviewId) return;

  const reviewRef = doc(db, "products", productId, "reviews", reviewId);
  await deleteDoc(reviewRef);

  await recalculateProductRating(productId);
}

/**
 * Toggles hidden status on a review (Admin action).
 */
export async function toggleHideReview(
  productId: string,
  reviewId: string,
  currentHidden: boolean
): Promise<void> {
  if (!productId || !reviewId) return;

  const reviewRef = doc(db, "products", productId, "reviews", reviewId);
  await updateDoc(reviewRef, {
    hidden: !currentHidden,
    updatedAt: serverTimestamp(),
  });

  await recalculateProductRating(productId);
}

/**
 * Fetches all reviews across all products for Admin moderation dashboard.
 */
export async function getAllReviewsForAdmin(): Promise<AdminReview[]> {
  try {
    const productsRef = collection(db, "products");
    const productsSnap = await getDocs(productsRef);

    const allReviews: AdminReview[] = [];

    for (const prodDoc of productsSnap.docs) {
      const prodData = prodDoc.data();
      const reviewsRef = collection(db, "products", prodDoc.id, "reviews");
      const reviewsSnap = await getDocs(reviewsRef);

      for (const rDoc of reviewsSnap.docs) {
        const rData = rDoc.data() as ProductReview;
        allReviews.push({
          id: rDoc.id,
          ...rData,
          productId: prodDoc.id,
          productName: prodData.name || "Product",
          productSlug: prodData.slug || prodDoc.id,
        });
      }
    }

    allReviews.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    return allReviews;
  } catch (err) {
    console.error("[ReviewService] Error fetching all reviews for admin:", err);
    return [];
  }
}
