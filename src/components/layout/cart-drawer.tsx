"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockProducts } from "@/lib/mock-data";
import Image from "next/image";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  // Using some mock products as cart items
  const cartItems = [
    { product: mockProducts[0], quantity: 1 },
    { product: mockProducts[2], quantity: 1 },
  ];
  
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

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
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="text-lg font-bold tracking-tight">Your Cart</h2>
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {cartItems.length}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {cartItems.map((item, i) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted border border-border/50">
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover mix-blend-multiply"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-medium text-sm line-clamp-2">{item.product.name}</h3>
                      <p className="text-muted-foreground text-sm mt-1">${item.product.price.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-border rounded-full">
                        <button className="p-1.5 hover:bg-muted rounded-full transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button className="p-1.5 hover:bg-muted rounded-full transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors">
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border/50 bg-muted/20">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-xl font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Shipping and taxes calculated at checkout.
              </p>
              <Button variant="premium" size="xl" className="w-full">
                Proceed to Checkout
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
