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
  const mergedMap = new Map<string, CartItem>();

  for (const item of remoteItems) {
    if (item && item.productId) {
      mergedMap.set(itemKey(item), { ...item });
    }
  }

  for (const item of localItems) {
    if (!item || !item.productId) continue;
    const key = itemKey(item);
    const existing = mergedMap.get(key);
    if (existing) {
      mergedMap.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
      });
    } else {
      mergedMap.set(key, { ...item });
    }
  }

  return Array.from(mergedMap.values());
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const key = itemKey(action.payload);
      const existing = state.items.findIndex((i) => itemKey(i) === key);
      if (existing >= 0) {
        const updated = [...state.items];
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + (action.payload.quantity ?? 1),
        };
        return { items: updated };
      }
      return { items: [...state.items, { ...action.payload, quantity: action.payload.quantity ?? 1 }] };
    }
    case "REMOVE_ITEM": {
      const key = itemKey(action.payload);
      return { items: state.items.filter((i) => itemKey(i) !== key) };
    }
    case "UPDATE_QTY": {
      const key = itemKey(action.payload);
      return {
        items: state.items.map((i) =>
          itemKey(i) === key ? { ...i, quantity: Math.max(1, action.payload.qty) } : i
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

  const showToast = (msg: string = "Added to cart ✓") => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 1. Initial Local Storage Hydration on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatch({ type: "HYDRATE", payload: parsed });
        }
      }
    } catch {
      // ignore
    }
    if (!user) {
      isHydratedRef.current = true;
    }
  }, []);

  // 2. Hydration & Safe Merge when User changes / logs in
  useEffect(() => {
    const currentUid = user?.uid || null;

    if (!currentUid) {
      prevUidRef.current = null;
      isHydratedRef.current = true;
      return;
    }

    if (prevUidRef.current === currentUid) {
      return;
    }

    prevUidRef.current = currentUid;
    isHydratedRef.current = false;

    const syncWithFirestore = async () => {
      try {
        const cartRef = doc(db, "users", currentUid, "cart", "default");
        const snap = await getDoc(cartRef);

        let finalItems: CartItem[] = [];
        if (snap.exists()) {
          const remoteItems = (snap.data().items as CartItem[]) || [];
          finalItems = mergeCartItems(state.items, remoteItems);
        } else {
          finalItems = state.items;
        }

        dispatch({ type: "HYDRATE", payload: finalItems });

        // Save merged result back to Firestore
        if (finalItems.length > 0) {
          await setDoc(cartRef, { items: finalItems, updatedAt: new Date() });
        }
      } catch (e: any) {
        console.warn("CartContext: Firestore sync notice (guest/offline mode active):", e?.message || e);
      } finally {
        isHydratedRef.current = true;
      }
    };

    syncWithFirestore();
  }, [user]);

  // 3. Persist cart updates (Local Storage & Firestore for authenticated user)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // ignore
    }

    if (!user || !user.uid || !isHydratedRef.current) {
      return;
    }

    const saveToDb = async () => {
      try {
        const cartRef = doc(db, "users", user.uid, "cart", "default");
        await setDoc(cartRef, { items: state.items, updatedAt: new Date() });
      } catch (e: any) {
        console.warn("CartContext: Failed saving cart to Firestore (offline/permission):", e?.message || e);
      }
    };

    saveToDb();
  }, [state.items, user]);

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
