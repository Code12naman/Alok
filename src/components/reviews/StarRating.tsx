"use client";

import { useState } from "react";
import { FiStar } from "react-icons/fi";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const SIZE_CLASSES = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-7 h-7",
};

export function StarRating({
  rating,
  maxStars = 5,
  size = "md",
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);

  const activeStars = hoverRating || rating;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRatingChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={`${
            interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"
          } p-0.5 focus:outline-none`}
          aria-label={`${star} Star Rating`}
        >
          <FiStar
            className={`${SIZE_CLASSES[size]} ${
              star <= activeStars
                ? "fill-[#F4A623] text-[#F4A623]"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
