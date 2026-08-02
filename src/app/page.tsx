"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/storefront/hero-section";
import { TrustBar } from "@/components/storefront/trust-bar";
import { CategoryGrid } from "@/components/storefront/category-grid";
import { CyberProductCard } from "@/components/streetwear/product-card";
import { BestsellerCard } from "@/components/storefront/bestseller-card";
import { PromoBanners } from "@/components/storefront/promo-banners";
import { BottomTrustStrip } from "@/components/storefront/bottom-trust-strip";
import {
  getActiveProducts,
  getNewArrivals,
  getBestSellers,
  FirestoreProduct,
} from "@/services/productService";
import { getCategories, FirestoreCategory } from "@/services/categoryService";

export default function Home() {
  const [products, setProducts] = useState<FirestoreProduct[]>([]);
  const [newArrivals, setNewArrivals] = useState<FirestoreProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<FirestoreProduct[]>([]);
  const [categories, setCategories] = useState<FirestoreCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getActiveProducts(),
      getNewArrivals(),
      getBestSellers(),
      getCategories(),
    ])
      .then(([all, newArr, best, cats]) => {
        setProducts(all);
        setNewArrivals(newArr);
        setBestSellers(best);
        setCategories(cats.filter((c) => c.active));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fallbacks if Firestore has few tagged items
  const newArrivalList = newArrivals.length >= 4 ? newArrivals.slice(0, 6) : products.slice(0, 6);
  const bestSellerList = bestSellers.length >= 2 ? bestSellers.slice(0, 3) : products.slice(0, 3);

  return (
    <div className="bg-white">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Trust Bar */}
      <TrustBar />

      {/* 3. Shop by Categories */}
      <CategoryGrid categories={categories} />

      {/* 4. New Arrivals */}
      <section className="bg-[#F7F7F5] py-12 md:py-16 border-y border-[#E6E6E3]">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-extrabold text-xl md:text-2xl text-[#111111] tracking-tight">
                New Arrivals
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Explore the latest additions to our modern catalog.
              </p>
            </div>
            <Link
              href="/shop?sort=newest"
              className="flex items-center gap-1 text-xs font-bold text-[#F4512C] hover:text-[#DD3F1E] transition-colors"
            >
              View All New Arrivals <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array(6).fill(null).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {newArrivalList.map((product, i) => (
                <CyberProductCard key={product.id || i} product={product} index={i} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 5. Best Sellers */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-extrabold text-xl md:text-2xl text-[#111111] tracking-tight">
                Best Sellers
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Top rated customer favorites chosen for exceptional design.
              </p>
            </div>
            <Link
              href="/shop?sort=popular"
              className="flex items-center gap-1 text-xs font-bold text-[#F4512C] hover:text-[#DD3F1E] transition-colors"
            >
              View All Best Sellers <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array(3).fill(null).map((_, i) => (
                <div key={i} className="h-36 bg-[#F7F7F5] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bestSellerList.map((product) => (
                <BestsellerCard key={product.id} product={product} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 6. Promotional Banners */}
      <PromoBanners />

      {/* 7. Bottom Trust Strip */}
      <BottomTrustStrip />
    </div>
  );
}
