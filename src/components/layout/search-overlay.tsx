"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getActiveProducts, FirestoreProduct } from "@/services/productService";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<FirestoreProduct[]>([]);
  const [results, setResults] = useState<FirestoreProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !loaded) {
      getActiveProducts()
        .then((p) => {
          setAllProducts(p);
          setLoaded(true);
        })
        .catch(console.error);
    }
  }, [isOpen, loaded]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const filtered = allProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 8);
    setResults(filtered);
  }, [query, allProducts]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-md"
          role="dialog"
          aria-label="Search"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E6E6E3]">
            <span className="font-bold text-lg text-[#111111]">Search Store</span>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Input */}
          <div className="p-6 border-b border-[#E6E6E3] bg-[#F7F7F5]">
            <div className="relative mx-auto max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, categories, brands..."
                className="w-full bg-white border border-[#E6E6E3] rounded-2xl pl-12 pr-10 py-3.5 text-sm text-[#111111] placeholder-gray-400 focus:outline-none focus:border-[#F4512C] shadow-sm transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-2xl">
              {!query.trim() && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Type something to search our catalog...
                </div>
              )}

              {query.trim() && results.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No products found for &ldquo;{query}&rdquo;
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    {results.length} Products Found
                  </p>
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-4 p-3 bg-[#F7F7F5] hover:bg-[#F2F2F0] rounded-xl border border-[#E6E6E3] transition-all group"
                    >
                      <div className="relative h-14 w-14 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-[#E6E6E3]">
                        {(product.thumbnail || product.images?.[0]) && (
                          <Image
                            src={product.thumbnail || product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-[#111111] group-hover:text-[#F4512C] transition-colors truncate">
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">{product.category}</p>
                      </div>
                      <span className="font-bold text-sm text-[#F4512C]">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
