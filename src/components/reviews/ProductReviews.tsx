"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  ProductReview,
  getProductReviews,
  hasUserPurchasedProduct,
  deleteReview,
} from "@/services/reviewService";
import { StarRating } from "./StarRating";
import { ReviewForm } from "./ReviewForm";
import { ProductReviewCard } from "./ProductReviewCard";
import {
  FiLoader,
  FiShoppingBag,
  FiEdit2,
  FiImage,
  FiCheckCircle,
} from "react-icons/fi";

interface ProductReviewsProps {
  productId: string;
  initialAverageRating?: number;
  initialReviewCount?: number;
  onRatingUpdated?: (stats: { averageRating: number; reviewCount: number }) => void;
}

export function ProductReviews({
  productId,
  initialAverageRating = 0,
  initialReviewCount = 0,
  onRatingUpdated,
}: ProductReviewsProps) {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ProductReview | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [avgRating, setAvgRating] = useState(initialAverageRating);
  const [totalCount, setTotalCount] = useState(initialReviewCount);

  // Load product reviews
  const loadReviews = async () => {
    setLoading(true);
    try {
      const fetched = await getProductReviews(productId, sortBy);
      setReviews(fetched);
      recalculateStats(fetched);
    } catch (err) {
      console.error("[ProductReviews] Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const recalculateStats = (list: ProductReview[]) => {
    const count = list.length;
    let avg = 0;
    if (count > 0) {
      const sum = list.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
      avg = Math.round((sum / count) * 10) / 10;
    }
    setAvgRating(avg);
    setTotalCount(count);
    if (onRatingUpdated) {
      onRatingUpdated({ averageRating: avg, reviewCount: count });
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId, sortBy]);

  // Check purchase history for current user
  useEffect(() => {
    if (!user || !productId) {
      setIsVerifiedBuyer(false);
      return;
    }

    setCheckingPurchase(true);
    hasUserPurchasedProduct(user.uid, productId)
      .then((purchased) => setIsVerifiedBuyer(purchased))
      .catch(() => setIsVerifiedBuyer(false))
      .finally(() => setCheckingPurchase(false));
  }, [user, productId]);

  const handleFormSuccess = async () => {
    setIsFormOpen(false);
    setEditingReview(null);
    setSuccessMsg("Your review has been updated!");
    await loadReviews();
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleStartEdit = (rev: ProductReview) => {
    setEditingReview(rev);
    setIsFormOpen(true);
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete your review?")) return;
    try {
      await deleteReview(productId, reviewId);
      await loadReviews();
      setSuccessMsg("Review deleted successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("[ProductReviews] Delete error:", err);
      alert("Failed to delete review.");
    }
  };

  const userHasReview = reviews.some((r) => r.userId === user?.uid);

  return (
    <div className="space-y-8 pt-8 border-t border-[#E6E6E3]">
      {/* Header & Overall Summary Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#F7F7F5] border border-[#E6E6E3] p-6 rounded-3xl">
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-extrabold text-[#111111]">
            Customer Reviews & Ratings
          </h2>
          <div className="flex items-center gap-3">
            <StarRating rating={Math.round(avgRating)} size="md" />
            <span className="font-extrabold text-lg text-[#111111]">
              {avgRating > 0 ? avgRating.toFixed(1) : "No Ratings"}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              ({totalCount} {totalCount === 1 ? "review" : "reviews"})
            </span>
          </div>
        </div>

        {/* Action Button / Verification Banner */}
        <div>
          {!user ? (
            <Link
              href={`/login?redirect=/product/${productId}`}
              className="inline-flex items-center gap-2 bg-[#111111] text-white text-xs font-bold px-5 py-3 rounded-2xl hover:bg-black transition-colors"
            >
              Log in to Review
            </Link>
          ) : checkingPurchase ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <FiLoader className="w-4 h-4 animate-spin text-[#F4512C]" />
              Verifying purchase...
            </div>
          ) : isVerifiedBuyer ? (
            !isFormOpen && (
              <button
                onClick={() => {
                  setEditingReview(null);
                  setIsFormOpen(true);
                }}
                className="bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <FiEdit2 className="w-4 h-4" />
                {userHasReview ? "Edit Your Review" : "Write Review"}
              </button>
            )
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2">
              <FiShoppingBag className="w-4 h-4 text-amber-600 flex-shrink-0" />
              You can review this product after purchasing it.
            </div>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2">
          <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Review Form Drawer */}
      {isFormOpen && isVerifiedBuyer && (
        <ReviewForm
          productId={productId}
          editingReview={editingReview}
          onSubmitSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingReview(null);
          }}
        />
      )}

      {/* Sorting & Review Cards List Header */}
      <div className="flex items-center justify-between border-b border-[#E6E6E3] pb-4">
        <h3 className="font-extrabold text-lg text-[#111111]">
          All Customer Reviews ({reviews.length})
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl px-3 py-1.5 text-xs font-bold text-[#111111] focus:outline-none focus:border-[#F4512C] cursor-pointer"
        >
          <option value="newest">Sort by: Newest</option>
          <option value="highest">Sort by: Highest Rating</option>
          <option value="lowest">Sort by: Lowest Rating</option>
        </select>
      </div>

      {/* Review Cards List */}
      {loading ? (
        <div className="py-16 text-center">
          <FiLoader className="w-8 h-8 text-[#F4512C] animate-spin mx-auto" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-[#F7F7F5] border border-[#E6E6E3] rounded-3xl p-12 text-center space-y-2">
          <FiImage className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="font-bold text-sm text-[#111111]">No reviews yet</p>
          <p className="text-xs text-gray-500">
            Be the first customer to purchase and review this item!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((rev) => (
            <ProductReviewCard
              key={rev.id}
              review={rev}
              currentUserId={user?.uid}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
