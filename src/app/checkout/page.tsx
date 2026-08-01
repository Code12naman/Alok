"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Shield, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(3); // Success step
    }, 2500);
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-muted/20">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tighter mb-4">Secure Checkout</h1>
          <div className="flex items-center justify-center gap-4 text-sm font-medium text-muted-foreground">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</span>
              Shipping
            </div>
            <div className="w-12 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
              Payment
            </div>
            <div className="w-12 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step === 3 ? 'text-success' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? 'bg-success text-success-foreground' : 'bg-muted'}`}>3</span>
              Success
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Checkout Area */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              
              {/* Step 1: Shipping */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-card border border-border rounded-2xl p-6 md:p-8"
                >
                  <h2 className="text-xl font-bold mb-6">Shipping Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First Name</label>
                      <input type="text" className="w-full bg-background border border-input rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Name</label>
                      <input type="text" className="w-full bg-background border border-input rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Doe" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Address</label>
                      <input type="text" className="w-full bg-background border border-input rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="123 Luxury Ave" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">City</label>
                      <input type="text" className="w-full bg-background border border-input rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="New York" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Postal Code</label>
                      <input type="text" className="w-full bg-background border border-input rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="10001" />
                    </div>
                  </div>
                  <Button size="xl" className="w-full" onClick={() => setStep(2)}>
                    Continue to Payment
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-card border border-border rounded-2xl p-6 md:p-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Payment Method</h2>
                    <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      Back to Shipping
                    </button>
                  </div>
                  
                  <div className="border border-primary bg-primary/5 rounded-xl p-4 mb-8 flex items-center gap-4">
                    <CreditCard className="w-6 h-6 text-primary" />
                    <span className="font-medium">Credit Card</span>
                    <div className="ml-auto flex gap-2">
                      <div className="w-10 h-6 bg-white rounded border border-border" />
                      <div className="w-10 h-6 bg-white rounded border border-border" />
                    </div>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Card Number</label>
                      <div className="relative">
                        <input type="text" className="w-full bg-background border border-input rounded-md px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0000 0000 0000 0000" />
                        <Lock className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Expiry Date</label>
                        <input type="text" className="w-full bg-background border border-input rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="MM/YY" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CVC</label>
                        <input type="text" className="w-full bg-background border border-input rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="123" />
                      </div>
                    </div>
                  </div>

                  <Button size="xl" variant="premium" className="w-full" onClick={handleCheckout} disabled={isProcessing}>
                    {isProcessing ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" /> Pay $598.99
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" /> Payments are secure and encrypted.
                  </p>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.2 }}
                    className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mb-6"
                  >
                    <Check className="w-10 h-10" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-4">Order Confirmed!</h2>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    Thank you for your purchase. Your order #LX-84920 has been received and is being processed.
                  </p>
                  <Button size="xl" asChild>
                    <Link href="/shop">Continue Shopping</Link>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          {step !== 3 && (
            <div className="w-full lg:w-96 flex-shrink-0">
              <div className="bg-card border border-border rounded-2xl p-6 lg:sticky lg:top-32">
                <h3 className="font-bold text-lg mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-6 pb-6 border-b border-border/50">
                  {/* Mock Item */}
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-muted rounded-md relative overflow-hidden flex-shrink-0">
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Img</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium line-clamp-1">Minimalist Chronograph Watch</h4>
                      <p className="text-sm text-muted-foreground mt-1">Qty: 1</p>
                    </div>
                    <span className="text-sm font-medium">$249.99</span>
                  </div>
                  {/* Mock Item */}
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-muted rounded-md relative overflow-hidden flex-shrink-0">
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Img</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium line-clamp-1">Noise-Cancelling Headphones</h4>
                      <p className="text-sm text-muted-foreground mt-1">Qty: 1</p>
                    </div>
                    <span className="text-sm font-medium">$349.00</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6 pb-6 border-b border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">$598.99</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-success">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxes</span>
                    <span className="font-medium">Calculated at next step</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>$598.99</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
