"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  quantity: number;
  size?: string;
  color?: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { productId: string; size?: string; color?: string } }
  | { type: "UPDATE_QTY"; payload: { productId: string; qty: number; size?: string; color?: string } }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; payload: CartItem[] };

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  cartTotal: number;
  toastMessage: string | null;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, qty: number, size?: string, color?: string) => void;
  clearCart: () => void;
  showToast: (msg?: string) => void;
}

const STORAGE_KEY = "street-mode-cart-v1";

export function itemKey(item: Pick<CartItem, "productId" | "size" | "color">) {
  return `${item.productId}__${item.size ?? ""}__${item.color ?? ""}`;
}

export function mergeCartItems(localItems: CartItem[], remoteItems: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();

  remoteItems.forEach(item => {
    if (item && item.productId) {
      map.set(itemKey(item), { ...item });
    }
  });

  localItems.forEach(item => {
    if (!item || !item.productId) return;
    const key = itemKey(item);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += Math.max(0, Number(item.quantity) || 0);
    } else {
      map.set(key, { ...item });
    }
  });

  return [...map.values()];
}

function cartItemsEqual(first: CartItem[], second: CartItem[]): boolean {
  const firstByKey = new Map<string, number>();
  const secondByKey = new Map<string, number>();

  for (const item of first) {
    if (!item?.productId) continue;
    const key = itemKey(item);
    firstByKey.set(key, (firstByKey.get(key) || 0) + (Number(item.quantity) || 0));
  }

  for (const item of second) {
    if (!item?.productId) continue;
    const key = itemKey(item);
    secondByKey.set(key, (secondByKey.get(key) || 0) + (Number(item.quantity) || 0));
  }

  if (firstByKey.size !== secondByKey.size) return false;
  for (const [key, quantity] of firstByKey) {
    if (secondByKey.get(key) !== quantity) return false;
  }
  return true;
}

// 🔒 Sanitize items before saving to Firestore
function sanitizeItems(items: CartItem[]): Record<string, unknown>[] {
  return items.map(i => ({
    ...i,
    size: i.size ?? null,
    color: i.color ?? null,
  }));
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const key = itemKey(action.payload);
      const existingIndex = state.items.findIndex((item) => itemKey(item) === key);

      if (existingIndex !== -1) {
        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + (action.payload.quantity ?? 1),
        };
        return { items: updatedItems };
      }

      return {
        items: [...state.items, { ...action.payload, quantity: action.payload.quantity ?? 1 }],
      };
    }

    case "REMOVE_ITEM": {
      const key = itemKey(action.payload);
      return { items: state.items.filter((item) => itemKey(item) !== key) };
    }

    case "UPDATE_QTY": {
      const key = itemKey(action.payload);
      return {
        items: state.items.map((item) =>
          itemKey(item) === key
            ? { ...item, quantity: Math.max(1, action.payload.qty) }
            : item
        ),
      };
    }

    case "CLEAR":
      return { items: [] };

    case "HYDRATE":
      return { items: action.payload };

    default:
      return state;
  }
}

const CartContext = createContext<CartContextType>({
  items: [],
  cartCount: 0,
  cartTotal: 0,
  toastMessage: null,
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  showToast: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { user } = useAuth();

  const isHydratedRef = useRef(false);
  const prevUidRef = useRef<string | null>(null);
  const itemsRef = useRef(state.items);
  const [localHydrated, setLocalHydrated] = useState(false);

  const showToast = (msg: string = "Added to cart ✓") => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    itemsRef.current = state.items;
  }, [state.items]);

  // 1. Local Storage Hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatch({ type: "HYDRATE", payload: parsed });
        }
      }
    } catch (error) {
      console.warn("CartContext: Failed to restore local cart:", error);
    } finally {
      setLocalHydrated(true);
    }
  }, []);

  // 2. Firestore Sync
  useEffect(() => {
    if (!localHydrated) return;

    const currentUid = user?.uid || null;
    if (!currentUid) {
      prevUidRef.current = null;
      isHydratedRef.current = true;
      return;
    }
    if (prevUidRef.current === currentUid) return;

    prevUidRef.current = currentUid;
    isHydratedRef.current = false;
    let cancelled = false;

    const syncWithFirestore = async () => {
      try {
        const cartRef = doc(db, "users", currentUid, "cart", "default");
        const snap = await getDoc(cartRef);

        const localItems = itemsRef.current;
        let finalItems: CartItem[];
        if (snap.exists()) {
          const remoteItems = (snap.data().items as CartItem[]) || [];
          // A refresh restores the same cart locally and remotely. Merging those
          // snapshots would incorrectly count every existing item twice.
          finalItems = cartItemsEqual(localItems, remoteItems)
            ? remoteItems
            : mergeCartItems(localItems, remoteItems);
        } else {
          finalItems = localItems;
        }

        if (cancelled) return;
        dispatch({ type: "HYDRATE", payload: finalItems });

        if (finalItems.length > 0) {
          await setDoc(cartRef, {
            items: sanitizeItems(finalItems),
            updatedAt: new Date(),
          }, { merge: true });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("CartContext: Firestore sync failed:", error);
        }
      } finally {
        if (!cancelled) isHydratedRef.current = true;
      }
    };

    syncWithFirestore();
    return () => {
      cancelled = true;
    };
  }, [localHydrated, user?.uid]);

  // 3. Persist Updates
  useEffect(() => {
    if (!localHydrated) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch (error) {
      console.warn("CartContext: Failed saving local cart:", error);
    }

    if (!user?.uid || !isHydratedRef.current) return;

    const saveToDb = async () => {
      try {
        const cartRef = doc(db, "users", user.uid, "cart", "default");
        await setDoc(cartRef, {
          items: sanitizeItems(state.items),
          updatedAt: new Date(),
        }, { merge: true });
      } catch (error) {
        console.warn("CartContext: Failed saving cart:", error);
      }
    };

    saveToDb();
  }, [localHydrated, state.items, user?.uid]);

  const cartCount = state.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const cartTotal = state.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);

  const addItem = (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    dispatch({ type: "ADD_ITEM", payload: { ...item, quantity: item.quantity ?? 1 } });
    showToast("Added to cart ✓");
  };

  const removeItem = (productId: string, size?: string, color?: string) =>
    dispatch({ type: "REMOVE_ITEM", payload: { productId, size, color } });

  const updateQuantity = (productId: string, qty: number, size?: string, color?: string) =>
    dispatch({ type: "UPDATE_QTY", payload: { productId, qty, size, color } });

  const clearCart = () => dispatch({ type: "CLEAR" });

    return (
    <CartContext.Provider
      value={{
        items: state.items,
        cartCount,
        cartTotal,
        toastMessage,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        showToast,
      }}
    >
      {children}

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#111111] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-white/10"
          >
            <div className="h-6 w-6 rounded-full bg-[#F4512C] text-white flex items-center justify-center font-bold text-xs">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
