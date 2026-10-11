"use client";

import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FirestoreCategory } from "@/services/categoryService";

const defaultCategories = [
  {
    name: "Men",
    image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Women",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Kids",
    image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Shoes",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Accessories",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Others",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800",
  },
];

interface CategoryGridProps {
  categories?: FirestoreCategory[];
}

export function CategoryGrid({ categories = [] }: CategoryGridProps) {

  // Remove duplicate categories
  const uniqueCategories = Array.from(
    new Map(
      categories.map((cat) => [
        cat.name.trim().toLowerCase(),
        cat,
      ])
    ).values()
  );

  const displayCats =
    uniqueCategories.length > 0
      ? uniqueCategories.slice(0, 6).map((c, i) => ({
          id: c.id || c.name.toLowerCase(),
          name: c.name,
          image:
            c.image ||
            defaultCategories[i % defaultCategories.length].image,
          href: `/shop?category=${encodeURIComponent(c.name)}`,
        }))
      : defaultCategories.map((c) => ({
          id: c.name.toLowerCase(),
          ...c,
          href: `/shop?category=${encodeURIComponent(c.name)}`,
        }));

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">

        <div className="flex items-center justify-between mb-8">
          <h2 className="font-extrabold text-xl md:text-2xl text-[#111111] tracking-tight">
            Shop by Categories
          </h2>

          <Link
            href="/shop"
            className="flex items-center gap-1 text-xs font-bold text-[#F4512C] hover:text-[#DD3F1E]"
          >
            View All Categories
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">

          {displayCats.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="group flex flex-col bg-[#F7F7F5] rounded-2xl overflow-hidden border border-[#E6E6E3] hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            >

              <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                <SafeImage
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width:640px)50vw,(max-width:1024px)33vw,16vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-3.5 bg-white">
                <h3 className="font-bold text-xs text-[#111111] group-hover:text-[#F4512C]">
                  {cat.name}
                </h3>

                <span className="flex items-center gap-1 text-[11px] text-gray-400 mt-1 group-hover:text-[#F4512C]">
                  Shop Now
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>

            </Link>
          ))}

        </div>
      </div>
    </section>
  );
}