"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Truck, Shield, ArrowRight, Minus, Plus, Heart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductBySlug, FirestoreProduct } from "@/services/productService";
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

  useEffect(() => {
    getProductBySlug(slug)
      .then(setProduct)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return (
    <div className="pt-32 min-h-screen flex items-center justify-center bg-background">
      <FiLoader className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="pt-32 min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <FiPackage className="w-16 h-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Product Not Found</h1>
      <p className="text-muted-foreground">This product may have been removed or the link is invalid.</p>
      <Link href="/shop"><Button variant="outline">Browse All Products</Button></Link>
    </div>
  );

  const images = product.images?.length ? product.images : [];

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <nav className="flex text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Gallery */}
          <div className="flex flex-col-reverse md:flex-row gap-4 lg:sticky lg:top-32 h-fit">
            {images.length > 1 && (
              <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${activeImage === i ? "border-primary" : "border-transparent hover:border-border"}`}>
                    <Image src={img} alt={`Image ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
              className="relative flex-1 aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden">
              {images.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.div key={activeImage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                    <Image src={images[activeImage]} alt={product.name} fill className="object-cover" priority />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300"><FiPackage className="w-16 h-16" /></div>
              )}
              {product.limitedDrop && (
                <span className="absolute top-4 right-4 bg-black text-white text-xs font-bold px-3 py-1 rounded-full">Limited Drop</span>
              )}
            </motion.div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{product.category}</span>
                {product.newArrival && <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">NEW</span>}
                {product.trending && <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">Trending</span>}
                {product.bestSeller && <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">Best Seller</span>}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">{product.name}</h1>

              {product.sku && <p className="text-xs text-muted-foreground mb-4">SKU: {product.sku}</p>}

              <div className="flex items-end gap-3 mb-6 pb-6 border-b border-border/50">
                <span className="text-4xl font-bold">₹{product.price.toFixed(0)}</span>
                {product.compareAtPrice && (
                  <>
                    <span className="text-xl text-muted-foreground line-through mb-1">₹{product.compareAtPrice.toFixed(0)}</span>
                    <span className="text-green-500 font-semibold text-sm">
                      {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              {product.shortDescription && <p className="text-lg text-muted-foreground leading-relaxed mb-6">{product.shortDescription}</p>}
              {product.description && !product.shortDescription && <p className="text-lg text-muted-foreground leading-relaxed mb-6">{product.description}</p>}

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-5">
                  <p className="text-sm font-semibold mb-2">Color: <span className="text-muted-foreground font-normal">{selectedColor || "Select"}</span></p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map(c => (
                      <button key={c} onClick={() => setSelectedColor(c)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${selectedColor === c ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-2">Size: <span className="text-muted-foreground font-normal">{selectedSize || "Select"}</span></p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(s => (
                      <button key={s} onClick={() => setSelectedSize(s)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedSize === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock */}
              {product.stock <= 5 && product.stock > 0 && (
                <p className="text-orange-500 text-sm font-semibold mb-4">⚡ Only {product.stock} left in stock!</p>
              )}
              {product.status === "out_of_stock" && <p className="text-red-500 text-sm font-semibold mb-4">Out of Stock</p>}

              {/* Qty & Add to Cart */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center border border-border rounded-lg h-12">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 h-full hover:bg-muted transition-colors rounded-l-lg">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))} className="px-4 h-full hover:bg-muted transition-colors rounded-r-lg">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  size="lg"
                  variant="premium"
                  className="flex-1 h-12"
                  onClick={handleAddToCart}
                  disabled={product.status === "out_of_stock"}
                >
                  <AnimatePresence mode="wait">
                    {added ? (
                      <motion.span key="added" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                        <Check className="w-4 h-4" /> Added to Cart
                      </motion.span>
                    ) : (
                      <motion.span key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {product.status === "out_of_stock" ? "Out of Stock" : `Add to Cart — ₹${(product.price * quantity).toFixed(0)}`}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
                <Button size="icon" variant="outline" className="h-12 w-12 rounded-lg flex-shrink-0">
                  <Heart className="w-5 h-5" />
                </Button>
              </div>

              {/* Product Details */}
              {(product.material || product.fit || product.careInstructions) && (
                <div className="border border-border/50 rounded-xl p-5 space-y-2 mb-6">
                  <h3 className="font-semibold text-sm mb-3">Product Details</h3>
                  {product.material && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Material:</span> {product.material}</p>}
                  {product.fit && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Fit:</span> {product.fit}</p>}
                  {product.careInstructions && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Care:</span> {product.careInstructions}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Free Shipping</h4>
                    <p className="text-xs text-muted-foreground">On orders over ₹999</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Easy Returns</h4>
                    <p className="text-xs text-muted-foreground">30-day return policy</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
