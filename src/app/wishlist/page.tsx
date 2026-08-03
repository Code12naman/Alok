"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { SafeImage } from "@/components/ui/SafeImage";

export default function WishlistPage() {
  const { items, toggleWishlist } = useWishlist();
  const { addItem } = useCart();

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-12">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col items-start gap-2 mb-8">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-[#F4512C] fill-[#F4512C]" />
            <h1 className="font-extrabold text-2xl md:text-3xl text-[#111111] tracking-tight">
              My Saved Wishlist
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            {items.length} {items.length === 1 ? "item" : "items"} saved for later.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#E6E6E3] max-w-md mx-auto my-12 shadow-xs">
            <div className="h-16 w-16 bg-[#FFF3F0] rounded-full flex items-center justify-center text-[#F4512C] mx-auto mb-4">
              <Heart className="h-8 w-8" />
            </div>
            <h2 className="font-bold text-lg text-[#111111] mb-2">Your Wishlist is Empty</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Explore our catalog and click the heart icon on any product to save it here.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-xs"
            >
              Explore Shop <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((product) => {
              const productSlug = product.slug || product.productId || "";
              return (
                <div
                  key={product.productId}
                  className="bg-white rounded-2xl overflow-hidden border border-[#E6E6E3] shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <Link href={`/product/${productSlug}`} className="relative aspect-[4/5] bg-[#F5F5F3] block overflow-hidden">
                      {product.image ? (
                        <SafeImage
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-300">
                          <ShoppingBag className="h-10 w-10" />
                        </div>
                      )}
                    </Link>

                    <div className="p-4">
                      {product.category && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          {product.category}
                        </span>
                      )}
                      <Link href={`/product/${productSlug}`}>
                        <h3 className="font-bold text-sm text-[#111111] hover:text-[#F4512C] transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="font-extrabold text-sm text-[#111111]">
                          ₹{product.price.toLocaleString("en-IN")}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-xs text-gray-400 line-through">
                            ₹{product.compareAtPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex items-center gap-2">
                    <button
                      onClick={() =>
                        addItem({
                          productId: product.productId,
                          name: product.name,
                          price: product.price,
                          image: product.image,
                          slug: product.slug,
                          quantity: 1,
                        })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-2xs"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
                    </button>

                    <button
                      onClick={() => toggleWishlist(product)}
                      aria-label="Remove from wishlist"
                      className="p-2.5 border border-[#E6E6E3] rounded-xl text-gray-400 hover:text-red-500 hover:bg-gray-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
