"use client";

import { useState } from "react";
import { ProductReview, formatOrderTimestamp } from "@/services/reviewService";
import { StarRating } from "./StarRating";
import { SafeImage } from "@/components/ui/SafeImage";
import { FiCheckCircle, FiEdit2, FiTrash2, FiX } from "react-icons/fi";

interface ProductReviewCardProps {
  review: ProductReview;
  currentUserId?: string;
  onEdit?: (review: ProductReview) => void;
  onDelete?: (reviewId: string) => void;
}

export function ProductReviewCard({
  review,
  currentUserId,
  onEdit,
  onDelete,
}: ProductReviewCardProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isOwner = currentUserId === review.userId;

  return (
    <div className="bg-[#F7F7F5] border border-[#E6E6E3] rounded-3xl p-6 space-y-4 transition-all hover:border-gray-300">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] aspect-square rounded-2xl overflow-hidden">
            <SafeImage
              src={lightboxImage}
              alt="Review attachment preview"
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

      {/* Author & Controls */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-[#F4512C] text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0 border border-white/20">
            {review.userPhoto ? (
              <SafeImage
                src={review.userPhoto}
                alt={review.userName}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              (review.userName || "C").charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-xs md:text-sm text-[#111111]">
                {review.userName}
              </h4>
              {review.verifiedPurchase && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  <FiCheckCircle className="w-3 h-3 text-emerald-600" /> Verified Purchase
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {formatOrderTimestamp(review.createdAt)}
            </p>
          </div>
        </div>

        {/* Owner Edit/Delete Action Buttons */}
        {isOwner && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(review)}
                className="p-1.5 text-gray-400 hover:text-[#F4512C] transition-colors"
                title="Edit Review"
              >
                <FiEdit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => review.id && onDelete(review.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete Review"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Star Rating */}
      <StarRating rating={review.rating} size="sm" />

      {/* Review Text */}
      <p className="text-xs md:text-sm text-gray-700 leading-relaxed font-medium">
        {review.review}
      </p>

      {/* Image Gallery */}
      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-2.5 pt-2">
          {review.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightboxImage(img)}
              className="relative h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden border border-[#E6E6E3] hover:opacity-90 transition-opacity bg-white flex-shrink-0 cursor-pointer"
            >
              <SafeImage
                src={img}
                alt={`Review attachment ${i + 1}`}
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
}
