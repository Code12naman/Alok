import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { CartItem } from "@/context/CartContext";
import { Address } from "./addressService";

export type PaymentMethod = "Razorpay" | "COD";
export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";
export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Order Confirmed"
  | "Processing"
  | "Shipped"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  subtotal: number;
}

export interface OrderData {
  id?: string;
  orderId: string;
  userId: string;
  customerId: string;
  items: OrderItem[];
  deliveryAddress: Address;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  // Aliases for admin panel compatibility
  status?: OrderStatus;
  totalAmount?: number;
  customerName?: string;
  customerEmail?: string;
  products?: OrderItem[];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type FirestoreOrder = OrderData;

/**
 * Generates a unique order ID format STM-2026-847291
 */
export function generateOrderId(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `STM-2026-${random}`;
}

/**
 * Creates a new order in Firestore and decrements inventory stock.
 */
export const createOrder = async (
  userId: string,
  customerId: string,
  cartItems: CartItem[],
  address: Address,
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus = "Pending",
  razorpayDetails?: { razorpayOrderId?: string; razorpayPaymentId?: string }
): Promise<OrderData> => {
  const orderId = generateOrderId();

  const orderItems: OrderItem[] = cartItems.map((i) => ({
    productId: i.productId,
    name: i.name,
    image: i.image,
    price: i.price,
    quantity: i.quantity,
    size: i.size,
    color: i.color,
    subtotal: i.price * i.quantity,
  }));

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryCharge = subtotal >= 999 ? 0 : 99;
  const discount = 0;
  const finalAmount = subtotal + deliveryCharge - discount;

  const payload: Omit<OrderData, "id"> = {
    orderId,
    userId,
    customerId: customerId || "STU-CUSTOMER",
    items: orderItems,
    deliveryAddress: address,
    subtotal,
    discount,
    deliveryCharge,
    finalAmount,
    paymentMethod,
    paymentStatus,
    orderStatus: "Order Confirmed",
    // Compatibility fields for admin panel
    status: "Order Confirmed",
    totalAmount: finalAmount,
    customerName: address.fullName || "",
    customerEmail: "",
    products: orderItems,
    razorpayOrderId: razorpayDetails?.razorpayOrderId || "",
    razorpayPaymentId: razorpayDetails?.razorpayPaymentId || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "orders"), payload);

  // Decrement stock in background
  try {
    for (const item of cartItems) {
      if (!item.productId) continue;
      const productRef = doc(db, "products", item.productId);
      const prodSnap = await getDoc(productRef);
      if (prodSnap.exists()) {
        const currentStock = prodSnap.data().stock || 0;
        const newStock = Math.max(0, currentStock - item.quantity);
        await updateDoc(productRef, { stock: newStock });
      }
    }
  } catch (err) {
    console.error("Failed to update product inventory:", err);
  }

  return { id: docRef.id, ...payload };
};

/**
 * Fetches all orders (for admin panel).
 */
export const getOrders = async (): Promise<FirestoreOrder[]> => {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as OrderData;
      return {
        id: d.id,
        ...data,
        status: data.status || data.orderStatus || "Order Confirmed",
        totalAmount: data.totalAmount || data.finalAmount || 0,
        customerName: data.customerName || data.deliveryAddress?.fullName || "Customer",
        products: data.products || data.items || [],
      };
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return [];
  }
};

/**
 * Updates order status (for admin panel).
 */
export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<void> => {
  const docRef = doc(db, "orders", id);
  await updateDoc(docRef, {
    orderStatus: status,
    status: status,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Fetches all orders for a specific user.
 */
export const getUserOrders = async (userId: string): Promise<OrderData[]> => {
  try {
    const q = query(
      collection(db, "orders"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderData));
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
};

/**
 * Fetches an order by its unique orderId string (e.g. STM-2026-847291) or doc id.
 */
export const getOrderById = async (orderId: string): Promise<OrderData | null> => {
  try {
    // Check by orderId field
    const q = query(collection(db, "orders"), where("orderId", "==", orderId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as OrderData;
    }

    // Fallback check by doc ID
    const docRef = doc(db, "orders", orderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as OrderData;
    }

    return null;
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return null;
  }
};
