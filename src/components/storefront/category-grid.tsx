"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { FirestoreCategory } from "@/services/categoryService";

const defaultCategories = [
  {
    name: "Fashion",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800",
    href: "/shop?category=Fashion",
  },
  {
    name: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800",
    href: "/shop?category=Electronics",
  },
  {
    name: "Beauty",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800",
    href: "/shop?category=Beauty",
  },
  {
    name: "Fitness",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800",
    href: "/shop?category=Fitness",
  },
  {
    name: "Home Decor",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800",
    href: "/shop?category=Home Decor",
  },
  {
    name: "Accessories",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
    href: "/shop?category=Accessories",
  },
];

interface CategoryGridProps {
  categories?: FirestoreCategory[];
}

export function CategoryGrid({ categories = [] }: CategoryGridProps) {
  // Map real categories or use default list
  const displayCats =
    categories.length > 0
      ? categories.slice(0, 6).map((c, i) => ({
          name: c.name,
          image: c.image || defaultCategories[i % defaultCategories.length].image,
          href: `/shop?category=${encodeURIComponent(c.name)}`,
        }))
      : defaultCategories;

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-extrabold text-xl md:text-2xl text-[#111111] tracking-tight">
            Shop by Categories
          </h2>
          <Link
            href="/categories"
            className="flex items-center gap-1 text-xs font-bold text-[#F4512C] hover:text-[#DD3F1E] transition-colors"
          >
            View All Categories <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Categories Grid (6 columns desktop, 3-4 tablet, 2 mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayCats.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="group flex flex-col bg-[#F7F7F5] rounded-2xl overflow-hidden border border-[#E6E6E3] hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >
              {/* Image container */}
              <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Text container */}
              <div className="p-3.5 text-left bg-white flex flex-col justify-between">
                <h3 className="font-bold text-xs text-[#111111] group-hover:text-[#F4512C] transition-colors">
                  {cat.name}
                </h3>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 group-hover:text-[#F4512C] transition-colors mt-1">
                  Shop Now <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
