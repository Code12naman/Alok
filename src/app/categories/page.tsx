"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCategories, FirestoreCategory } from "@/services/categoryService";
import { ArrowRight } from "lucide-react";
import { FiLoader } from "react-icons/fi";
import { SafeImage } from "@/components/ui/SafeImage";

const defaultCategories = [
  { name: "Men", image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80&w=800" },
  { name: "Women", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800" },
  { name: "Kids", image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=800" },
  { name: "Shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800" },
  { name: "Accessories", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800" },
  { name: "Others", image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<FirestoreCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then((cats) => setCategories(cats.filter((c) => c.active)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayCats =
    categories.length > 0
      ? categories.map((c, i) => ({
          id: c.id,
          name: c.name,
          image: c.image || defaultCategories[i % defaultCategories.length].image,
        }))
      : defaultCategories;

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-12">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        
        <div className="mb-10 text-center max-w-xl mx-auto">
          <span className="text-xs font-bold text-[#F4512C] uppercase tracking-wider block mb-1">
            Collections
          </span>
          <h1 className="font-extrabold text-3xl md:text-5xl text-[#111111] tracking-tight mb-3">
            Shop by Categories
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed">
            Discover our curated collections designed to elevate every aspect of your lifestyle.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-3xl border border-[#E6E6E3]">
            <FiLoader className="h-8 w-8 text-[#F4512C] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCats.map((cat) => (
              <Link
                key={cat.name}
                href={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="group relative h-[360px] rounded-3xl overflow-hidden shadow-xs border border-[#E6E6E3] block"
              >
                <SafeImage
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    Collection
                  </span>
                  <h2 className="font-extrabold text-3xl mb-4 text-white">
                    {cat.name}
                  </h2>
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-white bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/30 w-fit group-hover:bg-[#F4512C] group-hover:border-[#F4512C] transition-all">
                    <span>Shop Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
