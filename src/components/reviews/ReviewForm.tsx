"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ProductReview, addReview, updateReview } from "@/services/reviewService";
import { uploadToCloudinary } from "@/services/cloudinaryService";
import { StarRating } from "./StarRating";
import { SafeImage } from "@/components/ui/SafeImage";
import { FiUpload, FiX, FiLoader, FiAlertCircle } from "react-icons/fi";

interface ReviewFormProps {
  productId: string;
  editingReview?: ProductReview | null;
  onSubmitSuccess: () => void;
  onCancel?: () => void;
}

export function ReviewForm({
  productId,
  editingReview,
  onSubmitSuccess,
  onCancel,
}: ReviewFormProps) {
  const { user, profile } = useAuth();

  const [rating, setRating] = useState<number>(editingReview?.rating || 5);
  const [reviewText, setReviewText] = useState<string>(editingReview?.review || "");
  const [images, setImages] = useState<string[]>(editingReview?.images || []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const res = await uploadToCloudinary(file, "street-mode/reviews");
        newUrls.push(res.url);
      }
      setImages((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      console.error("[ReviewForm] Error uploading image:", err);
      setErrorMsg(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      if (editingReview?.id) {
        await updateReview(productId, editingReview.id, {
          rating,
          review: reviewText,
          images,
        });
      } else {
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
      }

      onSubmitSuccess();
    } catch (err: any) {
      console.error("[ReviewForm] Submit error:", err);
      setErrorMsg(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#F7F7F5] border-2 border-[#F4512C]/30 p-6 md:p-8 rounded-3xl space-y-6 animate-fadeIn"
    >
      <div className="flex items-center justify-between border-b border-[#E6E6E3] pb-4">
        <h3 className="font-extrabold text-base text-[#111111]">
          {editingReview ? "Edit Your Review" : "Write a Product Review"}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-black p-1 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
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
        <div className="flex items-center gap-3">
          <StarRating
            rating={rating}
            size="lg"
            interactive
            onRatingChange={(newRating) => setRating(newRating)}
          />
          <span className="text-xs font-extrabold text-gray-700">
            {rating} / 5 Stars
          </span>
        </div>
      </div>

      {/* Review Textarea */}
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

      {/* Image Uploads */}
      <div className="space-y-3">
        <label className="text-xs font-extrabold text-[#111111] uppercase tracking-wider block">
          Attach Photos (Optional, max 5)
        </label>

        <div className="flex flex-wrap gap-3 items-center">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative h-20 w-20 rounded-2xl overflow-hidden border border-[#E6E6E3] group bg-white"
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
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-[#E6E6E3] text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || uploadingImage}
          className="bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-7 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {submitting && <FiLoader className="w-4 h-4 animate-spin" />}
          {editingReview ? "Save Changes" : "Submit Review"}
        </button>
      </div>
    </form>
  );
}
