"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  slug: string;
  category?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  toggleWishlist: (item: WishlistItem) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
}

const STORAGE_KEY = "street-mode-wishlist-v1";

const WishlistContext = createContext<WishlistContextType>({
  items: [],
  toggleWishlist: () => {},
  isInWishlist: () => false,
  wishlistCount: 0,
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  // Hydrate on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore errors
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore errors
    }
  }, [items]);

  const toggleWishlist = (item: WishlistItem) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.productId === item.productId);
      if (exists) {
        return prev.filter((i) => i.productId !== item.productId);
      } else {
        return [...prev, item];
      }
    });
  };

  const isInWishlist = (productId: string) => {
    return items.some((i) => i.productId === productId);
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        toggleWishlist,
        isInWishlist,
        wishlistCount: items.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
