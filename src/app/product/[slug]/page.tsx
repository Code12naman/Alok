"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Truck, Shield, RefreshCw, Minus, Plus, Heart, Check, ShoppingBag, ArrowRight } from "lucide-react";
import { getProductBySlug, FirestoreProduct } from "@/services/productService";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FiLoader, FiPackage } from "react-icons/fi";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<FirestoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    getProductBySlug(slug)
      .then(setProduct)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]">
        <FiLoader className="h-8 w-8 text-[#F4512C] animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F5] gap-4 p-4 text-center">
        <FiPackage className="h-16 w-16 text-gray-300" />
        <h1 className="text-2xl font-bold text-[#111111]">Product Not Found</h1>
        <p className="text-xs text-gray-500 max-w-sm">This product link may be invalid or has been removed.</p>
        <Link href="/shop" className="bg-[#F4512C] text-white text-xs font-bold px-6 py-3 rounded-xl">
          Browse Catalog
        </Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const isOOS = product.status === "out_of_stock" || product.stock === 0;
  const isWishlisted = isInWishlist(product.id || "");

  const handleAddToCart = () => {
    addItem({
      productId: product.id!,
      name: product.name,
      price: product.price,
      image: product.thumbnail || images[0] || "",
      slug: product.slug,
      quantity,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleToggleWishlist = () => {
    toggleWishlist({
      productId: product.id!,
      name: product.name,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: product.thumbnail || images[0] || "",
      slug: product.slug,
      category: product.category,
    });
  };

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  return (
    <div className="min-h-screen bg-white py-8 md:py-12">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-8">
          <Link href="/" className="hover:text-[#F4512C] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-[#F4512C] transition-colors">Shop</Link>
          <span>/</span>
          <span className="text-[#111111] font-semibold truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          
          {/* Left Gallery (7 cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4">
            {images.length > 1 && (
              <div className="flex md:flex-col gap-3 overflow-x-auto pb-2 md:pb-0 md:w-20 flex-shrink-0">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative h-20 w-20 md:w-full rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 bg-[#F5F5F3] ${
                      activeImage === i ? "border-[#F4512C]" : "border-[#E6E6E3] hover:border-gray-400"
                    }`}
                  >
                    <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 aspect-[4/5] bg-[#F5F5F3] rounded-3xl overflow-hidden border border-[#E6E6E3]">
              {images.length > 0 ? (
                <Image
                  src={images[activeImage]}
                  alt={product.name}
                  fill
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-300">
                  <FiPackage className="h-16 w-16" />
                </div>
              )}

              {discount && (
                <span className="absolute top-4 left-4 bg-[#F4512C] text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                  -{discount}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Right Details (5 cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-start space-y-6">
            <div>
              <span className="text-xs font-bold text-[#F4512C] uppercase tracking-wider block mb-2">
                {product.category}
              </span>
              <h1 className="font-extrabold text-2xl md:text-3xl text-[#111111] leading-tight mb-2">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center text-[#F4A623]">
                  {Array(5).fill(null).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#F4A623]" />
                  ))}
                </div>
                <span className="text-xs text-gray-500 font-medium">(128 customer reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 pb-6 border-b border-[#E6E6E3]">
              <span className="font-extrabold text-3xl text-[#111111]">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-lg text-gray-400 line-through font-medium">
                  ₹{product.compareAtPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
              {product.shortDescription || product.description || "High quality everyday product crafted for comfort and performance."}
            </p>

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
                  Color: <span className="text-gray-500 font-normal">{selectedColor || "Select Color"}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        selectedColor === c
                          ? "border-[#F4512C] bg-[#FFF3F0] text-[#F4512C]"
                          : "border-[#E6E6E3] hover:border-gray-400 text-gray-700"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
                  Size: <span className="text-gray-500 font-normal">{selectedSize || "Select Size"}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`h-10 min-w-10 px-3 rounded-xl border text-xs font-bold transition-all ${
                        selectedSize === s
                          ? "border-[#F4512C] bg-[#F4512C] text-white"
                          : "border-[#E6E6E3] hover:border-gray-400 text-gray-700 bg-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qty & Add to Cart */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center border border-[#E6E6E3] rounded-xl h-12 bg-white">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 h-full text-gray-600 hover:text-black transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                  className="px-3.5 h-full text-gray-600 hover:text-black transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isOOS}
                className="flex-1 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    {isOOS ? "Out of Stock" : `Add to Cart — ₹${(product.price * quantity).toLocaleString("en-IN")}`}
                  </>
                )}
              </button>

              <button
                onClick={handleToggleWishlist}
                aria-label="Wishlist"
                className="h-12 w-12 border border-[#E6E6E3] rounded-xl flex items-center justify-center text-gray-600 hover:text-[#F4512C] transition-colors"
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-[#F4512C] text-[#F4512C]" : ""}`} />
              </button>
            </div>

            {/* Service Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#E6E6E3]">
              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#F7F7F5]">
                <Truck className="h-4 w-4 text-[#F4512C] mb-1" />
                <span className="text-[10px] font-bold text-[#111111]">Free Shipping</span>
                <span className="text-[9px] text-gray-500">Over ₹999</span>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#F7F7F5]">
                <RefreshCw className="h-4 w-4 text-[#F4512C] mb-1" />
                <span className="text-[10px] font-bold text-[#111111]">30-Day Returns</span>
                <span className="text-[9px] text-gray-500">Hassle-free</span>
              </div>
              <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#F7F7F5]">
                <Shield className="h-4 w-4 text-[#F4512C] mb-1" />
                <span className="text-[10px] font-bold text-[#111111]">Secure Payment</span>
                <span className="text-[9px] text-gray-500">100% encrypted</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
