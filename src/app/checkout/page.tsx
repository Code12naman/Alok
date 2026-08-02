"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Shield, Lock, CreditCard, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";

const inputClass =
  "w-full bg-[#F7F7F5] border border-[#E6E6E3] rounded-xl px-4 py-3 text-xs text-[#111111] placeholder-gray-400 focus:outline-none focus:border-[#F4512C] transition-colors font-medium";

const labelClass = "text-xs font-bold text-[#111111] block mb-1.5";

export default function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const { items, cartTotal, clearCart } = useCart();

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      clearCart();
      setStep(3);
    }, 2000);
  };

  const shipping = cartTotal >= 999 ? 0 : 99;
  const total = cartTotal + shipping;

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-12">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-extrabold text-2xl md:text-3xl text-[#111111] tracking-tight mb-4">
            Secure Checkout
          </h1>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-gray-500">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-[#F4512C]" : ""}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? "bg-[#F4512C] text-white" : "bg-gray-200"}`}>1</span>
              Shipping
            </div>
            <div className="w-12 h-px bg-[#E6E6E3]" />
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-[#F4512C]" : ""}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? "bg-[#F4512C] text-white" : "bg-gray-200"}`}>2</span>
              Payment
            </div>
            <div className="w-12 h-px bg-[#E6E6E3]" />
            <div className={`flex items-center gap-2 ${step === 3 ? "text-emerald-600" : ""}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? "bg-emerald-600 text-white" : "bg-gray-200"}`}>3</span>
              Success
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Form */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              
              {/* Step 1: Shipping */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white border border-[#E6E6E3] rounded-3xl p-6 md:p-8 shadow-xs"
                >
                  <h2 className="font-bold text-base text-[#111111] mb-6">Shipping Address</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className={labelClass}>First Name</label>
                      <input type="text" className={inputClass} placeholder="John" />
                    </div>
                    <div>
                      <label className={labelClass}>Last Name</label>
                      <input type="text" className={inputClass} placeholder="Doe" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Email Address</label>
                      <input type="email" className={inputClass} placeholder="you@example.com" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Street Address</label>
                      <input type="text" className={inputClass} placeholder="123 Luxury Ave" />
                    </div>
                    <div>
                      <label className={labelClass}>City</label>
                      <input type="text" className={inputClass} placeholder="New Delhi" />
                    </div>
                    <div>
                      <label className={labelClass}>Postal Code</label>
                      <input type="text" className={inputClass} placeholder="110001" />
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-3.5 rounded-xl shadow-xs transition-colors"
                  >
                    Continue to Payment
                  </button>
                </motion.div>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white border border-[#E6E6E3] rounded-3xl p-6 md:p-8 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-base text-[#111111]">Payment Method</h2>
                    <button onClick={() => setStep(1)} className="text-xs font-semibold text-gray-500 hover:text-black">
                      ← Back to Shipping
                    </button>
                  </div>

                  <div className="border border-[#F4512C] bg-[#FFF3F0] rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-[#F4512C]" />
                    <span className="font-bold text-xs text-[#111111]">Credit / Debit Card</span>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className={labelClass}>Card Number</label>
                      <input type="text" className={inputClass} placeholder="0000 0000 0000 0000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Expiry Date</label>
                        <input type="text" className={inputClass} placeholder="MM/YY" />
                      </div>
                      <div>
                        <label className={labelClass}>CVC</label>
                        <input type="text" className={inputClass} placeholder="123" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-[#F4512C] hover:bg-[#DD3F1E] text-white text-xs font-bold py-3.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <>
                        <Lock className="h-4 w-4" /> Pay ₹{total.toLocaleString("en-IN")}
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-gray-400 mt-4 flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3" /> Payments are 100% secure & encrypted.
                  </p>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-[#E6E6E3] rounded-3xl p-10 text-center shadow-xs"
                >
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8" />
                  </div>
                  <h2 className="font-extrabold text-2xl text-[#111111] mb-2">Order Confirmed!</h2>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
                    Thank you for your purchase. Your order #LX-84920 has been received and is being processed.
                  </p>
                  <Link href="/shop" className="bg-[#F4512C] text-white text-xs font-bold px-6 py-3 rounded-xl inline-block">
                    Continue Shopping
                  </Link>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          {step !== 3 && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="bg-white border border-[#E6E6E3] rounded-3xl p-6 shadow-xs sticky top-24">
                <h3 className="font-bold text-sm text-[#111111] mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-4 pb-4 border-b border-[#E6E6E3]">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400">No items in cart</p>
                  ) : (
                    items.map((item, i) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <div className="h-12 w-12 bg-[#F7F7F5] rounded-lg relative overflow-hidden flex-shrink-0 border border-[#E6E6E3]">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-gray-300 m-auto" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[#111111] truncate">{item.name}</h4>
                          <p className="text-gray-400 text-[10px]">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-bold text-[#111111]">
                          ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2 text-xs text-gray-600 mb-4 pb-4 border-b border-[#E6E6E3]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-black">₹{cartTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold text-[#F4512C]">
                      {shipping === 0 ? "FREE" : `₹${shipping}`}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm font-bold text-[#111111]">
                  <span>Total</span>
                  <span className="text-base text-[#F4512C]">₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
