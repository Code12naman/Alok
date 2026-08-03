"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { FiPackage } from "react-icons/fi";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400' fill='%23F5F5F3'><rect width='400' height='400'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23999999'>Image Unavailable</text></svg>";

export function SafeImage({ src, alt, fallbackSrc = DEFAULT_FALLBACK_SVG, ...props }: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    if (props.fill) {
      return (
        <div className="relative w-full h-full bg-[#F5F5F3] flex flex-col items-center justify-center text-gray-400 p-2">
          <FiPackage className="h-8 w-8 mb-1 opacity-50" />
          <span className="text-[10px] font-medium text-gray-400 text-center line-clamp-1">{alt || "Product"}</span>
        </div>
      );
    }
    return (
      <Image
        {...props}
        src={fallbackSrc}
        alt={alt || "Fallback Image"}
        onError={() => {
          // Prevent infinite fallback loop
        }}
      />
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      onError={() => {
        setError(true);
      }}
    />
  );
}
