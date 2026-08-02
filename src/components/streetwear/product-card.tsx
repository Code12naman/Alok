"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FirestoreProduct } from "@/services/productService";

interface ProductCardProps {
  product: FirestoreProduct;
  index?: number;
}

export function CyberProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isOOS = product.status === "out_of_stock" || product.stock === 0;
  const imageUrl = product.thumbnail || product.images?.[0] || "";
  const isWishlisted = isInWishlist(product.id || "");

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id!,
      name: product.name,
      price: product.price,
      image: imageUrl,
      slug: product.slug,
      quantity: 1,
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      productId: product.id!,
      name: product.name,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: imageUrl,
      slug: product.slug,
      category: product.category,
    });
  };

  // Calculate discount percentage if compareAtPrice exists
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-[#E6E6E3] hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative"
    >
      {/* ── Image Container ── */}
      <Link href={`/product/${product.slug}`} className="relative aspect-[4/5] bg-[#F5F5F3] overflow-hidden block">
        {/* Image */}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          {discount ? (
            <span className="bg-[#F4512C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          ) : product.newArrival ? (
            <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              NEW
            </span>
          ) : null}
        </div>

        {/* Wishlist Heart Button */}
        <button
          onClick={handleToggleWishlist}
          aria-label="Toggle Wishlist"
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-600 hover:text-[#F4512C] transition-colors shadow-2xs"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isWishlisted ? "fill-[#F4512C] text-[#F4512C]" : ""
            }`}
          />
        </button>

        {/* Quick Add floating button (Hover desktop) */}
        {!isOOS && (
          <button
            onClick={handleAddToCart}
            aria-label="Add to cart"
            className="absolute bottom-3 right-3 z-10 h-9 w-9 rounded-full bg-black text-white flex items-center justify-center hover:bg-[#F4512C] transition-colors shadow-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        )}
      </Link>

      {/* ── Info Container ── */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-white">
        <div>
          <Link href={`/product/${product.slug}`}>
            <h3 className="font-semibold text-xs text-[#111111] line-clamp-1 group-hover:text-[#F4512C] transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Ratings */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center text-[#F4A623]">
              {Array(5).fill(null).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-[#F4A623]" />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">(128)</span>
          </div>
        </div>

        {/* Price Row */}
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E6E6E3]/60">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm text-[#111111]">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-gray-400 line-through">
                ₹{product.compareAtPrice.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOOS}
            className="text-[11px] font-bold text-[#F4512C] hover:text-[#DD3F1E] transition-colors sm:hidden"
          >
            + Add
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/* Static Card fallback for mock items */
interface StaticCardProps {
  title: string;
  price: string;
  compareAtPrice?: string;
  image: string;
  tag?: string;
  index?: number;
}

export function ProductCard({ title, price, compareAtPrice, image, tag, index = 0 }: StaticCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-[#E6E6E3] hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative"
    >
      <div className="relative aspect-[4/5] bg-[#F5F5F3] overflow-hidden block">
        <Image
          src={image}
          alt={title}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {tag && (
          <span className="absolute top-3 left-3 bg-[#F4512C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {tag}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between bg-white">
        <div>
          <h3 className="font-semibold text-xs text-[#111111] line-clamp-1 group-hover:text-[#F4512C] transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center text-[#F4A623]">
              {Array(5).fill(null).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-[#F4A623]" />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">(95)</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E6E6E3]/60">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm text-[#111111]">{price}</span>
            {compareAtPrice && (
              <span className="text-xs text-gray-400 line-through">{compareAtPrice}</span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}