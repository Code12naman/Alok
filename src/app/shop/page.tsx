"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, Search, ChevronDown } from "lucide-react";
import { getActiveProducts, FirestoreProduct } from "@/services/productService";
import { getCategories, FirestoreCategory } from "@/services/categoryService";
import { CyberProductCard } from "@/components/streetwear/product-card";
import { FiLoader, FiPackage } from "react-icons/fi";

const sortOptions = [
  { value: "newest", label: "Newest Arrivals" },
  { value: "popular", label: "Most Popular" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

export default function ShopPage() {
  const [products, setProducts] = useState<FirestoreProduct[]>([]);
  const [categories, setCategories] = useState<FirestoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    Promise.all([getActiveProducts(), getCategories()])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = products
    .filter((p) => activeCategory === "All" || p.category === activeCategory)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return 0;
    });

  const CategorySidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-sm text-[#111111] mb-3 uppercase tracking-wider">Categories</h3>
        <div className="space-y-1">
          <button
            onClick={() => setActiveCategory("All")}
            className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === "All"
                ? "bg-[#F4512C] text-white"
                : "text-gray-600 hover:bg-[#F7F7F5] hover:text-[#111111]"
            }`}
          >
            <span>All Products</span>
            <span className={activeCategory === "All" ? "text-white/80" : "text-gray-400"}>
              {products.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat.name).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === cat.name
                    ? "bg-[#F4512C] text-white"
                    : "text-gray-600 hover:bg-[#F7F7F5] hover:text-[#111111]"
                }`}
              >
                <span>{cat.name}</span>
                <span className={activeCategory === cat.name ? "text-white/80" : "text-gray-400"}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeCategory !== "All" && (
        <button
          onClick={() => setActiveCategory("All")}
          className="text-xs font-bold text-[#F4512C] hover:underline flex items-center gap-1"
        >
          <X className="h-3.5 w-3.5" /> Reset Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-8 md:py-12">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold text-[#F4512C] uppercase tracking-wider mb-1">Catalog</p>
          <h1 className="font-extrabold text-3xl md:text-4xl text-[#111111] tracking-tight">
            Shop All Products
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Browse our complete collection of trending apparel, accessories, and electronics.
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-[#E6E6E3] shadow-xs mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl pl-9 pr-3 py-2 text-xs text-[#111111] placeholder-gray-400 focus:outline-none focus:border-[#F4512C]"
              />
            </div>

            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-1.5 bg-[#F7F7F5] border border-[#E6E6E3] text-gray-700 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
            <span>Showing {filtered.length} products</span>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl px-3 py-2 text-xs font-bold text-[#111111] focus:outline-none cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-60 flex-shrink-0 bg-white p-5 rounded-2xl border border-[#E6E6E3] shadow-xs h-fit sticky top-24">
            <CategorySidebar />
          </aside>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {sidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="fixed inset-0 z-50 bg-black/40 lg:hidden"
                />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-white p-6 lg:hidden overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E6E6E3]">
                    <h3 className="font-bold text-sm text-[#111111]">Filter Products</h3>
                    <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400 hover:text-black">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <CategorySidebar />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Product Cards Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-[#E6E6E3]">
                <FiLoader className="h-8 w-8 text-[#F4512C] animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E6E6E3] p-12 text-center">
                <FiPackage className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-base text-[#111111] mb-1">No products found</h3>
                <p className="text-xs text-gray-500 mb-4">Try clearing your filters or search terms.</p>
                <button
                  onClick={() => { setSearch(""); setActiveCategory("All"); }}
                  className="bg-[#F4512C] text-white text-xs font-bold px-4 py-2.5 rounded-xl"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((product, i) => (
                  <CyberProductCard key={product.id || i} product={product} index={i} />
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
