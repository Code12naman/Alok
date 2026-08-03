"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { FirestoreProduct, getImageUrl } from "@/services/productService";
import { SafeImage } from "@/components/ui/SafeImage";

interface BestsellerCardProps {
  product: FirestoreProduct;
}

export function BestsellerCard({ product }: BestsellerCardProps) {
  const { addItem } = useCart();
  const imageUrl = getImageUrl(product.thumbnail) || getImageUrl(product.images?.[0]) || "";
  const productSlug = product.slug || product.id || "";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id!,
      name: product.name,
      price: product.price,
      image: imageUrl,
      slug: productSlug,
      quantity: 1,
    });
  };

  return (
    <div className="flex bg-white rounded-2xl overflow-hidden border border-[#E6E6E3] hover:shadow-md transition-all duration-300 p-3 gap-4 items-center">
      {/* Left: Product Image */}
      <Link
        href={`/product/${productSlug}`}
        className="relative h-32 w-32 flex-shrink-0 bg-[#F5F5F3] rounded-xl overflow-hidden block"
      >
        {imageUrl ? (
          <SafeImage src={imageUrl} alt={product.name} fill sizes="128px" className="object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300">
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}
      </Link>

      {/* Right: Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          {/* Bestseller Badge */}
          <span className="inline-block bg-[#F4A623] text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5">
            Bestseller
          </span>

          <Link href={`/product/${productSlug}`}>
            <h3 className="font-bold text-xs md:text-sm text-[#111111] line-clamp-1 hover:text-[#F4512C] transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center text-[#F4A623]">
              {Array(5).fill(null).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-[#F4A623]" />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">(256)</span>
          </div>

          <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 font-medium">
            {product.shortDescription || product.description || "Premium quality everyday essential."}
          </p>
        </div>

        {/* Price & Quick Add Row */}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-extrabold text-sm text-[#111111]">
            ₹{product.price.toLocaleString("en-IN")}
          </span>

          <button
            onClick={handleAddToCart}
            className="inline-flex items-center gap-1.5 bg-black hover:bg-[#F4512C] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-colors shadow-2xs"
          >
            Quick Add
          </button>
        </div>
      </div>
    </div>
  );
}
