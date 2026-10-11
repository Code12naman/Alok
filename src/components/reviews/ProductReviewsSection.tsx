"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  ProductReview,
  getProductReviews,
  hasUserPurchasedProduct,
  addReview,
  updateReview,
  deleteReview,
  formatOrderTimestamp,
} from "@/services/reviewService";
import { uploadToCloudinary } from "@/services/cloudinaryService";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  FiStar,
  FiCheckCircle,
  FiUpload,
  FiX,
  FiEdit2,
  FiTrash2,
  FiLoader,
  FiAlertCircle,
  FiShoppingBag,
  FiImage,
} from "react-icons/fi";

interface ProductReviewsSectionProps {
  productId: string;
  initialAverageRating?: number;
  initialReviewCount?: number;
  onRatingUpdated?: (stats: { averageRating: number; reviewCount: number }) => void;
}

export function ProductReviewsSection({
  productId,
  initialAverageRating = 0,
  initialReviewCount = 0,
  onRatingUpdated,
}: ProductReviewsSectionProps) {
  const { user, profile } = useAuth();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Calculated stats
  const [avgRating, setAvgRating] = useState(initialAverageRating);
  const [totalCount, setTotalCount] = useState(initialReviewCount);

  // 1. Fetch reviews
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

  // 2. Check purchase status for logged-in user
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

  // Handle Image Upload to Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      setErrorMsg("Please sign in before uploading review images.");
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setErrorMsg("You can attach a maximum of 5 images per review.");
      return;
    }

    setUploadingImage(true);
    setErrorMsg("");

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds maximum size limit of 5MB.`);
        }
        const idToken = await user.getIdToken();
        const res = await uploadToCloudinary(file, idToken, undefined, "street-mode/reviews");
        newUrls.push(res.url);
      }
      setImages((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      console.error("[ReviewImageUpload] Error uploading image:", err);
      setErrorMsg(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Remove Image
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Start Edit Existing Review
  const handleStartEdit = (rev: ProductReview) => {
    if (!rev.id) return;
    setEditingReviewId(rev.id);
    setRating(rev.rating);
    setReviewText(rev.review);
    setImages(rev.images || []);
    setIsFormOpen(true);
    setErrorMsg("");
  };

  // Submit Review Form (Create or Edit)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg("Please select a star rating (1–5).");
      return;
    }
    if (reviewText.trim().length < 10) {
      setErrorMsg("Review content must be at least 10 characters long.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const userName = profile?.name || user.displayName || "Verified Customer";
      const userPhoto = (profile as any)?.photoURL || (profile as any)?.photo || user.photoURL || "";

      if (editingReviewId) {
        // Edit existing review
        await updateReview(productId, editingReviewId, {
          rating,
          review: reviewText,
          images,
        });
        setSuccessMsg("Your review has been updated!");
      } else {
        // Create new review
        await addReview({
          productId,
          userId: user.uid,
          userName,
          userPhoto,
          rating,
          review: reviewText,
          images,
          verifiedPurchase: true,
        });
        setSuccessMsg("Thank you! Your review has been published.");
      }

      // Reset form
      setIsFormOpen(false);
      setEditingReviewId(null);
      setRating(5);
      setReviewText("");
      setImages([]);

      // Reload reviews live
      await loadReviews();
    } catch (err: any) {
      console.error("[ProductReviews] Submit error:", err);
      setErrorMsg(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId: string) => {
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
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] aspect-square rounded-2xl overflow-hidden">
            <SafeImage
              src={lightboxImage}
              alt="Review attachment"
              fill
              sizes="100vw"
              className="object-contain"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header & Overall Rating Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#F7F7F5] border border-[#E6E6E3] p-6 rounded-3xl">
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-extrabold text-[#111111] flex items-center gap-2">
            Customer Reviews & Ratings
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-[#F4A623]">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(avgRating)
                      ? "fill-[#F4A623] text-[#F4A623]"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
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
                  setEditingReviewId(null);
                  setRating(5);
                  setReviewText("");
                  setImages([]);
                  setIsFormOpen(true);
                }}
                className="bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-sm transition-all flex items-center gap-2"
              >
                <FiEdit2 className="w-4 h-4" />
                {userHasReview ? "Edit Your Review" : "Write a Review"}
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

      {/* Review Form Drawer / Modal */}
      {isFormOpen && isVerifiedBuyer && (
        <form
          onSubmit={handleSubmitReview}
          className="bg-[#F7F7F5] border-2 border-[#F4512C]/30 p-6 md:p-8 rounded-3xl space-y-6 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-[#E6E6E3] pb-4">
            <h3 className="font-extrabold text-base text-[#111111]">
              {editingReviewId ? "Edit Your Review" : "Write a Product Review"}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-gray-400 hover:text-black p-1"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Star Rating Picker */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[#111111] uppercase tracking-wider block">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <FiStar
                    className={`w-7 h-7 ${
                      star <= (hoverRating || rating)
                        ? "fill-[#F4A623] text-[#F4A623]"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-3 text-xs font-extrabold text-gray-700">
                {hoverRating || rating} / 5 Stars
              </span>
            </div>
          </div>

          {/* Review Content Input */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[#111111] uppercase tracking-wider block">
              Your Review <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell others what you think about this product's quality, fit, style, and comfort..."
              className="w-full bg-white border border-[#E6E6E3] rounded-2xl p-4 text-xs md:text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#F4512C]"
            />
            <p className="text-[11px] text-gray-500 text-right">
              {reviewText.trim().length} / min 10 characters
            </p>
          </div>

          {/* Image Attachments */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold text-[#111111] uppercase tracking-wider block">
              Attach Photos (Optional, max 5)
            </label>

            <div className="flex flex-wrap gap-3 items-center">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative h-20 w-20 rounded-2xl overflow-hidden border border-[#E6E6E3] group"
                >
                  <SafeImage src={img} alt={`Attachment ${i + 1}`} fill sizes="80px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <label className="h-20 w-20 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#F4512C] flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                  {uploadingImage ? (
                    <FiLoader className="w-5 h-5 text-[#F4512C] animate-spin" />
                  ) : (
                    <>
                      <FiUpload className="w-5 h-5 text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500 font-bold">Add Photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E6E3]">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-[#E6E6E3] text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-7 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <FiLoader className="w-4 h-4 animate-spin" />}
              {editingReviewId ? "Save Changes" : "Publish Review"}
            </button>
          </div>
        </form>
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
          {reviews.map((rev) => {
            const isOwner = user?.uid === rev.userId;

            return (
              <div
                key={rev.id}
                className="bg-[#F7F7F5] border border-[#E6E6E3] rounded-3xl p-6 space-y-4 transition-all"
              >
                {/* Author Bar */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-[#F4512C] text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0 border border-white/20">
                      {rev.userPhoto ? (
                        <SafeImage
                          src={rev.userPhoto}
                          alt={rev.userName}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        (rev.userName || "C").charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs md:text-sm text-[#111111]">
                          {rev.userName}
                        </h4>
                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            <FiCheckCircle className="w-3 h-3 text-emerald-600" /> Verified Purchase
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                        {formatOrderTimestamp(rev.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Owner Controls */}
                  {isOwner && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(rev)}
                        className="p-1.5 text-gray-400 hover:text-[#F4512C] transition-colors"
                        title="Edit Review"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => rev.id && handleDeleteReview(rev.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Review"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Rating Stars */}
                <div className="flex items-center text-[#F4A623]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FiStar
                      key={star}
                      className={`w-4 h-4 ${
                        star <= rev.rating
                          ? "fill-[#F4A623] text-[#F4A623]"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-xs md:text-sm text-gray-700 leading-relaxed font-medium">
                  {rev.review}
                </p>

                {/* Uploaded Images Gallery */}
                {rev.images && rev.images.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {rev.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxImage(img)}
                        className="relative h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden border border-[#E6E6E3] hover:opacity-90 transition-opacity bg-white flex-shrink-0"
                      >
                        <SafeImage
                          src={img}
                          alt={`Review photo ${i + 1}`}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
