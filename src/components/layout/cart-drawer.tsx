"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";

import { useEffect } from "react";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, cartCount, cartTotal, removeItem, updateQuantity } = useCart();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white flex flex-col shadow-2xl border-l border-[#E6E6E3]"
            aria-label="Shopping Cart Drawer"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E6E6E3]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#F4512C]" />
                <h2 className="font-bold text-base text-[#111111]">Your Cart</h2>
                <span className="bg-[#F4512C] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close cart"
                className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
                  <div className="h-16 w-16 bg-[#F7F7F5] rounded-full flex items-center justify-center text-gray-400 mb-2">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-lg text-[#111111]">Your Cart is Empty</h3>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Looks like you haven&apos;t added any products to your cart yet.
                  </p>
                  <Link
                    href="/shop"
                    onClick={onClose}
                    className="mt-2 inline-flex items-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all"
                  >
                    Start Shopping <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                items.map((item, i) => (
                  <div
                    key={`${item.productId}-${item.size}-${item.color}-${i}`}
                    className="flex gap-3 p-3 bg-[#F7F7F5] rounded-xl border border-[#E6E6E3] relative"
                  >
                    {/* Product Image */}
                    <div className="relative h-20 w-20 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-[#E6E6E3]">
                      {item.image ? (
                        <SafeImage src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-300">
                          <ShoppingBag className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 pr-6">
                      <div>
                        <h4 className="font-semibold text-xs text-[#111111] line-clamp-1">
                          {item.name}
                        </h4>
                        {(item.size || item.color) && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {[item.size, item.color].filter(Boolean).join(" / ")}
                          </p>
                        )}
                        <p className="font-bold text-xs text-[#F4512C] mt-1">
                          ₹{item.price.toLocaleString("en-IN")}
                        </p>
                      </div>

                      {/* Qty controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-[#E6E6E3] bg-white rounded-lg h-7">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1, item.size, item.color)
                            }
                            className="px-2 h-full text-gray-600 hover:text-black transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1, item.size, item.color)
                            }
                            className="px-2 h-full text-gray-600 hover:text-black transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeItem(item.productId, item.size, item.color)}
                      aria-label="Remove item"
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-5 border-t border-[#E6E6E3] bg-white space-y-4">
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-black">₹{cartTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold text-[#F4512C]">
                      {cartTotal >= 999 ? "FREE" : "Calculated at checkout"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#E6E6E3]">
                  <span className="font-bold text-sm text-[#111111]">Total</span>
                  <span className="font-bold text-lg text-[#F4512C]">
                    ₹{cartTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/cart"
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center bg-[#F7F7F5] border border-[#E6E6E3] hover:bg-gray-100 text-[#111111] font-bold text-xs py-3.5 rounded-xl transition-all"
                  >
                    View Cart Page
                  </Link>
                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#F4512C] hover:bg-[#DD3F1E] text-white font-bold text-xs py-3.5 rounded-xl shadow-sm transition-all"
                  >
                    Checkout <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
