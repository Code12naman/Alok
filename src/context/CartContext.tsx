"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";

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
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, qty: number, size?: string, color?: string) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "street-mode-cart-v1";

function itemKey(item: Pick<CartItem, "productId" | "size" | "color">) {
  return `${item.productId}__${item.size ?? ""}__${item.color ?? ""}`;
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
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

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
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // ignore
    }
  }, [state.items]);

  const cartCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addItem = (item: Omit<CartItem, "quantity"> & { quantity?: number }) =>
    dispatch({ type: "ADD_ITEM", payload: { ...item, quantity: item.quantity ?? 1 } });

  const removeItem = (productId: string, size?: string, color?: string) =>
    dispatch({ type: "REMOVE_ITEM", payload: { productId, size, color } });

  const updateQuantity = (productId: string, qty: number, size?: string, color?: string) =>
    dispatch({ type: "UPDATE_QTY", payload: { productId, qty, size, color } });

  const clearCart = () => dispatch({ type: "CLEAR" });

  return (
    <CartContext.Provider
      value={{ items: state.items, cartCount, cartTotal, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
