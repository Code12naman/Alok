"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Minus, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, cartCount, cartTotal, updateQuantity, removeItem } = useCart();

  const deliveryFee = cartTotal >= 999 || items.length === 0 ? 0 : 99;
  const totalAmount = cartTotal + deliveryFee;

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-10 md:py-16">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-extrabold text-2xl md:text-3xl text-[#111111] tracking-tight">
              Shopping Cart
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              You have {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
            </p>
          </div>

          <Link
            href="/shop"
            className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-[#F4512C] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          /* Empty Cart State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#E6E6E3] rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xs"
          >
            <div className="h-20 w-20 bg-[#F7F7F5] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-[#111111] mb-2">Your Cart is Empty</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Explore our latest urban fashion collections and find something elevate your style.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold px-8 py-3.5 rounded-xl shadow-xs transition-colors"
            >
              Explore Collection <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items List (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item, idx) => (
                <motion.div
                  key={`${item.productId}-${item.size}-${item.color}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-[#E6E6E3] rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-xs"
                >
                  {/* Thumbnail */}
                  <div className="relative h-24 w-24 flex-shrink-0 bg-[#F7F7F5] rounded-xl overflow-hidden border border-[#E6E6E3]">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-300">
                        <ShoppingBag className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.slug}`}
                      className="font-bold text-sm text-[#111111] hover:text-[#F4512C] transition-colors truncate block"
                    >
                      {item.name}
                    </Link>

                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 font-medium mt-1">
                      {item.size && (
                        <span className="bg-[#F7F7F5] border border-[#E6E6E3] px-2 py-0.5 rounded-md">
                          Size: <strong className="text-black">{item.size}</strong>
                        </span>
                      )}
                      {item.color && (
                        <span className="bg-[#F7F7F5] border border-[#E6E6E3] px-2 py-0.5 rounded-md">
                          Color: <strong className="text-black">{item.color}</strong>
                        </span>
                      )}
                    </div>

                    <p className="font-extrabold text-sm text-[#F4512C] mt-2">
                      ₹{item.price.toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* Quantity Controls & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-[#E6E6E3]">
                    <div className="flex items-center border border-[#E6E6E3] bg-[#F7F7F5] rounded-xl h-9">
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1, item.size, item.color)
                        }
                        className="px-3 h-full text-gray-600 hover:text-black transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1, item.size, item.color)
                        }
                        className="px-3 h-full text-gray-600 hover:text-black transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-sm text-[#111111] block">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                      <button
                        onClick={() => removeItem(item.productId, item.size, item.color)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors inline-flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              <div className="pt-2">
                <Link
                  href="/shop"
                  className="sm:hidden inline-flex items-center gap-2 text-xs font-bold text-[#F4512C] hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
                </Link>
              </div>
            </div>

            {/* Order Summary Card (4 cols) */}
            <div className="lg:col-span-4">
              <div className="bg-white border border-[#E6E6E3] rounded-3xl p-6 md:p-8 shadow-xs sticky top-24 space-y-6">
                <h2 className="font-bold text-base text-[#111111]">Order Summary</h2>

                <div className="space-y-3 text-xs text-gray-600 border-b border-[#E6E6E3] pb-4">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartCount} items)</span>
                    <span className="font-bold text-[#111111]">₹{cartTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span className="font-bold text-[#F4512C]">
                      {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                    </span>
                  </div>
                  {deliveryFee > 0 && (
                    <p className="text-[10px] text-gray-400">
                      Add ₹{(999 - cartTotal).toLocaleString("en-IN")} more to qualify for FREE Delivery!
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center text-base font-extrabold text-[#111111]">
                  <span>Total Amount</span>
                  <span className="text-xl text-[#F4512C]">₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>

                <Link
                  href="/checkout"
                  className="w-full flex items-center justify-center gap-2 bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-4 rounded-xl shadow-xs transition-colors"
                >
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="bg-[#F7F7F5] rounded-xl p-3.5 text-center text-[11px] text-gray-500 font-medium">
                  🔒 Safe & Secure Checkout with Instant Order Tracking
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
