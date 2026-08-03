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
 * Recursively removes any keys with `undefined` values from objects, arrays, and nested structures.
 * Preserves Firestore FieldValue (e.g. serverTimestamp()), Date, and Timestamp instances.
 */
export function deepSanitizeFirestore<T>(val: T): T {
  if (val === undefined || val === null) {
    return val;
  }

  if (
    typeof val !== "object" ||
    val instanceof Date ||
    (val as any)?._methodName ||
    typeof (val as any)?.toDate === "function"
  ) {
    return val;
  }

  if (Array.isArray(val)) {
    return val
      .map((item) => deepSanitizeFirestore(item))
      .filter((item) => item !== undefined) as unknown as T;
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(val as Record<string, any>)) {
    if (value !== undefined) {
      const sanitized = deepSanitizeFirestore(value);
      if (sanitized !== undefined) {
        cleanObj[key] = sanitized;
      }
    }
  }

  return cleanObj as T;
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
  if (!userId) {
    throw new Error("Authentication required: Order creation requires a logged-in user ID.");
  }
  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cannot create order: Shopping cart is empty.");
  }

  const orderId = generateOrderId();

  // 1. Audit and normalize every order item
  const orderItems: OrderItem[] = cartItems.map((i) => {
    const rawImage = typeof i.image === "string" ? i.image : (i.image as any)?.url || "";
    const item: Record<string, any> = {
      productId: i.productId || "",
      name: i.name || "Product",
      image: rawImage,
      price: Number(i.price) || 0,
      quantity: Number(i.quantity) || 1,
      subtotal: (Number(i.price) || 0) * (Number(i.quantity) || 1),
    };

    if (i.size && typeof i.size === "string" && i.size.trim() !== "") {
      item.size = i.size.trim();
    }
    if (i.color && typeof i.color === "string" && i.color.trim() !== "") {
      item.color = i.color.trim();
    }

    return item as OrderItem;
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryCharge = subtotal >= 999 ? 0 : 99;
  const discount = 0;
  const finalAmount = subtotal + deliveryCharge - discount;

  // 2. Normalize shipping address snapshot
  const normalizedAddress: Record<string, any> = {
    fullName: address.fullName || "",
    phone: address.phone || "",
    building: address.building || address.addressLine1 || "",
    street: address.street || address.addressLine2 || "",
    addressLine1: address.addressLine1 || address.building || "",
    addressLine2: address.addressLine2 || address.street || "",
    city: address.city || "",
    state: address.state || "",
    pinCode: address.pinCode || address.postalCode || "",
    postalCode: address.postalCode || address.pinCode || "",
    country: address.country || "India",
  };

  if (address.landmark && address.landmark.trim() !== "") {
    normalizedAddress.landmark = address.landmark.trim();
  }
  if (address.type && address.type.trim() !== "") {
    normalizedAddress.type = address.type.trim();
  }

  // 3. Construct base order payload
  const rawPayload: Record<string, any> = {
    orderId,
    userId,
    customerId: customerId || "STU-CUSTOMER",
    items: orderItems,
    deliveryAddress: normalizedAddress,
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
  };

  if (razorpayDetails?.razorpayOrderId) {
    rawPayload.razorpayOrderId = razorpayDetails.razorpayOrderId;
  }
  if (razorpayDetails?.razorpayPaymentId) {
    rawPayload.razorpayPaymentId = razorpayDetails.razorpayPaymentId;
  }

  // 4. Perform deep sanitization to guarantee NO undefined fields anywhere in the object tree
  const sanitizedPayload = deepSanitizeFirestore(rawPayload);

  // Add timestamps after sanitization
  const finalPayload = {
    ...sanitizedPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.log(`[OrderService] Creating order "${orderId}" for user (${userId}):`, finalPayload);

  const docRef = await addDoc(collection(db, "orders"), finalPayload);
  console.log(`[OrderService] Order created successfully with Firestore doc ID: ${docRef.id}`);

  // 5. Decrement stock in background
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
    console.error("[OrderService] Failed to update product inventory stock:", err);
  }

  return { id: docRef.id, ...finalPayload } as OrderData;
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
  if (!userId) {
    console.warn("[OrderService] getUserOrders called without userId.");
    return [];
  }

  try {
    let snap;
    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      snap = await getDocs(q);
    } catch (indexErr: any) {
      console.warn("[OrderService] Composite index query fallback to un-ordered query:", indexErr?.message || indexErr);
      const fallbackQuery = query(
        collection(db, "orders"),
        where("userId", "==", userId)
      );
      snap = await getDocs(fallbackQuery);
    }

    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderData));
    docs.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    return docs;
  } catch (error: any) {
    console.error(`[OrderService] Error fetching orders for user (${userId}):`, error?.code, error?.message, error);
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
