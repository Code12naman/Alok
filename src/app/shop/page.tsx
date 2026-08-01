"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveProducts, FirestoreProduct } from "@/services/productService";
import { getCategories, FirestoreCategory } from "@/services/categoryService";
import { FiLoader, FiPackage } from "react-icons/fi";

export default function ShopPage() {
  const [products, setProducts] = useState<FirestoreProduct[]>([]);
  const [categories, setCategories] = useState<FirestoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([getActiveProducts(), getCategories()])
      .then(([prods, cats]) => { setProducts(prods); setCategories(cats); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = products
    .filter(p => activeCategory === "All" || p.category === activeCategory)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return 0; // newest = already ordered by createdAt desc from Firestore
    });

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">The Collection</h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Discover our complete range of premium streetwear, crafted for those who wear with intent.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="border border-border rounded-md px-3 py-2 bg-card text-sm focus:outline-none w-40" />
            <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-card">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <select value={sort} onChange={e => setSort(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-32">
              <h3 className="font-semibold text-lg mb-4">Categories</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setActiveCategory("All")}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeCategory === "All" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground"}`}>
                    All Products
                  </button>
                </li>
                {categories.map(cat => (
                  <li key={cat.id}>
                    <button onClick={() => setActiveCategory(cat.name)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeCategory === cat.name ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground"}`}>
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>

          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <FiLoader className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24">
                <FiPackage className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">{search || activeCategory !== "All" ? "No products found" : "Coming Soon"}</h3>
                <p className="text-muted-foreground">
                  {search || activeCategory !== "All" ? "Try adjusting your filters." : "Products will appear here once added by admin."}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filtered.map((product, i) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      key={product.id}
                      className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    >
                      <Link href={`/product/${product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                        {product.newArrival && (
                          <span className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">NEW</span>
                        )}
                        {product.thumbnail || product.images?.[0] ? (
                          <Image
                            src={product.thumbnail || product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <FiPackage className="w-12 h-12" />
                          </div>
                        )}
                      </Link>
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-2 text-sm text-muted-foreground">
                          <span>{product.category}</span>
                          {product.tags?.slice(0, 1).map(t => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{t}</span>)}
                        </div>
                        <h3 className="font-semibold text-lg line-clamp-1 mb-2">{product.name}</h3>
                        {product.shortDescription && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.shortDescription}</p>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xl">₹{product.price}</span>
                            {product.compareAtPrice && (
                              <span className="text-sm text-muted-foreground line-through">₹{product.compareAtPrice}</span>
                            )}
                          </div>
                          <Link href={`/product/${product.slug}`}>
                            <Button variant="outline" size="sm" className="rounded-full">View</Button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
