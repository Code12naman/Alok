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

export interface CustomerSnapshot {
  name: string;
  email: string;
  phone: string;
}

export interface ShippingAddressSnapshot {
  fullName: string;
  phone: string;
  building: string;
  street: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
  postalCode?: string;
  country: string;
}

export interface OrderData {
  id?: string;
  orderNumber?: string;
  orderId: string;
  userId: string;
  customerId: string;
  customer?: CustomerSnapshot;
  shippingAddress?: ShippingAddressSnapshot;
  deliveryAddress: Address;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
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

export interface NormalizedOrder {
  id: string; // Firestore Doc ID
  orderId: string; // e.g. STM-2026-847291
  orderNumber: string;
  userId: string;
  customerId: string;
  customer: CustomerSnapshot;
  shippingAddress: ShippingAddressSnapshot;
  deliveryAddress: ShippingAddressSnapshot;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryCharge: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  status: OrderStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt?: any;
  updatedAt?: any;
  createdAtFormatted: string;
  updatedAtFormatted?: string;
}

export type FirestoreOrder = NormalizedOrder;

/**
 * Generates a unique order ID format STM-2026-847291
 */
export function generateOrderId(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `STM-2026-${random}`;
}

/**
 * Safely formats Firestore timestamps, Date objects, or string dates deterministically.
 */
export function formatOrderTimestamp(ts: any): string {
  if (!ts) return "—";
  try {
    let date: Date;
    if (typeof ts.toDate === "function") {
      date = ts.toDate();
    } else if (typeof ts.seconds === "number") {
      date = new Date(ts.seconds * 1000);
    } else if (ts instanceof Date) {
      date = ts;
    } else {
      date = new Date(ts);
    }
    if (isNaN(date.getTime())) return "—";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return "—";
  }
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
 * Normalizes raw Firestore order documents (new and legacy) to guarantee safe rendering.
 */
export function normalizeOrder(raw: any): NormalizedOrder {
  if (!raw) {
    return {
      id: "UNKNOWN",
      orderId: "UNKNOWN",
      orderNumber: "UNKNOWN",
      userId: "",
      customerId: "",
      customer: { name: "Customer", email: "Not available for this order", phone: "—" },
      shippingAddress: {
        fullName: "Customer",
        phone: "—",
        building: "",
        street: "",
        city: "",
        state: "",
        pinCode: "",
        country: "India",
      },
      deliveryAddress: {
        fullName: "Customer",
        phone: "—",
        building: "",
        street: "",
        city: "",
        state: "",
        pinCode: "",
        country: "India",
      },
      items: [],
      subtotal: 0,
      discount: 0,
      deliveryCharge: 0,
      finalAmount: 0,
      paymentMethod: "COD",
      paymentStatus: "Pending",
      orderStatus: "Order Confirmed",
      status: "Order Confirmed",
      createdAtFormatted: "—",
    };
  }

  const docId = raw.id || raw.orderId || "UNKNOWN";
  const oId = raw.orderId || raw.orderNumber || docId;
  const num = raw.orderNumber || oId || `#${docId.slice(-8)}`;

  // Extract address snapshot with full legacy fallbacks
  const rawAddr = raw.shippingAddress || raw.deliveryAddress || {};
  const fullName =
    raw.customer?.name ||
    rawAddr.fullName ||
    raw.customerName ||
    "Customer";
  const phone =
    raw.customer?.phone ||
    rawAddr.phone ||
    raw.customerPhone ||
    "—";
  const email =
    raw.customer?.email ||
    raw.customerEmail ||
    "Not available for this order";

  const addressSnapshot: ShippingAddressSnapshot = {
    fullName,
    phone,
    building: rawAddr.building || rawAddr.addressLine1 || "",
    street: rawAddr.street || rawAddr.addressLine2 || "",
    addressLine1: rawAddr.addressLine1 || rawAddr.building || "",
    addressLine2: rawAddr.addressLine2 || rawAddr.street || "",
    landmark: rawAddr.landmark || undefined,
    city: rawAddr.city || "",
    state: rawAddr.state || "",
    pinCode: rawAddr.pinCode || rawAddr.postalCode || "",
    postalCode: rawAddr.postalCode || rawAddr.pinCode || "",
    country: rawAddr.country || "India",
  };

  // Extract items
  const rawItems = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.products) ? raw.products : [];
  const normalizedItems: OrderItem[] = rawItems.map((i: any) => ({
    productId: i.productId || i.id || "",
    name: i.name || "Product",
    image: typeof i.image === "string" ? i.image : i.image?.url || "",
    price: Number(i.price) || 0,
    quantity: Number(i.quantity) || 1,
    size: i.size || undefined,
    color: i.color || undefined,
    subtotal: Number(i.subtotal) || (Number(i.price) || 0) * (Number(i.quantity) || 1),
  }));

  const sub = Number(raw.subtotal) || Number(raw.totalAmount) || Number(raw.finalAmount) || 0;
  const disc = Number(raw.discount) || 0;
  const del = Number(raw.deliveryCharge) ?? (sub >= 999 ? 0 : 99);
  const fin = Number(raw.finalAmount) || Number(raw.totalAmount) || (sub + del - disc);

  const statusVal: OrderStatus = raw.orderStatus || raw.status || "Order Confirmed";

  return {
    id: docId,
    orderId: oId,
    orderNumber: num,
    userId: raw.userId || "",
    customerId: raw.customerId || raw.userId || "—",
    customer: {
      name: fullName,
      email: email,
      phone: phone,
    },
    shippingAddress: addressSnapshot,
    deliveryAddress: addressSnapshot,
    items: normalizedItems,
    subtotal: sub,
    discount: disc,
    couponCode: raw.couponCode || undefined,
    deliveryCharge: del,
    finalAmount: fin,
    paymentMethod: raw.paymentMethod || "COD",
    paymentStatus: raw.paymentStatus || (raw.paymentMethod === "Razorpay" ? "Paid" : "Pending"),
    orderStatus: statusVal,
    status: statusVal,
    razorpayOrderId: raw.razorpayOrderId || undefined,
    razorpayPaymentId: raw.razorpayPaymentId || undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    createdAtFormatted: formatOrderTimestamp(raw.createdAt),
    updatedAtFormatted: raw.updatedAt ? formatOrderTimestamp(raw.updatedAt) : undefined,
  };
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
  razorpayDetails?: { razorpayOrderId?: string; razorpayPaymentId?: string },
  userEmail?: string,
  couponDetails?: { couponCode?: string; discount?: number }
): Promise<NormalizedOrder> => {
  if (!userId) {
    throw new Error("Authentication required: Order creation requires a logged-in user ID.");
  }
  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cannot create order: Shopping cart is empty.");
  }

  const orderId = generateOrderId();
  const email = userEmail || "";

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
  const discount = couponDetails?.discount || 0;
  const deliveryCharge = subtotal >= 999 ? 0 : 99;
  const finalAmount = Math.max(0, subtotal + deliveryCharge - discount);

  // 2. Customer snapshot
  const customerSnapshot = {
    name: address.fullName || "Customer",
    email: email,
    phone: address.phone || "",
  };

  // 3. Shipping address snapshot
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

  // 4. Construct base order payload
  const rawPayload: Record<string, any> = {
    orderNumber: orderId,
    orderId,
    userId,
    customerId: customerId || "STU-CUSTOMER",
    customer: customerSnapshot,
    shippingAddress: normalizedAddress,
    deliveryAddress: normalizedAddress,
    items: orderItems,
    products: orderItems,
    subtotal,
    discount,
    couponCode: couponDetails?.couponCode || "",
    deliveryCharge,
    finalAmount,
    totalAmount: finalAmount,
    customerName: address.fullName || "",
    customerEmail: email,
    paymentMethod,
    paymentStatus,
    orderStatus: "Order Confirmed",
    status: "Order Confirmed",
  };

  if (razorpayDetails?.razorpayOrderId) {
    rawPayload.razorpayOrderId = razorpayDetails.razorpayOrderId;
  }
  if (razorpayDetails?.razorpayPaymentId) {
    rawPayload.razorpayPaymentId = razorpayDetails.razorpayPaymentId;
  }

  // 5. Deep sanitization to guarantee NO undefined fields
  const sanitizedPayload = deepSanitizeFirestore(rawPayload);

  const finalPayload = {
    ...sanitizedPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.log(`[OrderService] Creating order "${orderId}" for user (${userId}):`, finalPayload);

  const docRef = await addDoc(collection(db, "orders"), finalPayload);
  console.log(`[OrderService] Order created successfully with Firestore doc ID: ${docRef.id}`);

  // 6. Decrement stock in background
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

  return normalizeOrder({ id: docRef.id, ...finalPayload });
};

/**
 * Fetches all orders (for admin panel).
 */
export const getOrders = async (): Promise<NormalizedOrder[]> => {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeOrder({ id: d.id, ...d.data() }));
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
export const getUserOrders = async (userId: string): Promise<NormalizedOrder[]> => {
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

    const docs = snap.docs.map((d) => normalizeOrder({ id: d.id, ...d.data() }));
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
export const getOrderById = async (orderId: string): Promise<NormalizedOrder | null> => {
  try {
    // 1. Query by orderId field
    const q = query(collection(db, "orders"), where("orderId", "==", orderId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return normalizeOrder({ id: d.id, ...d.data() });
    }

    // 2. Query by orderNumber field
    const qNum = query(collection(db, "orders"), where("orderNumber", "==", orderId));
    const snapNum = await getDocs(qNum);
    if (!snapNum.empty) {
      const d = snapNum.docs[0];
      return normalizeOrder({ id: d.id, ...d.data() });
    }

    // 3. Fallback check by doc ID
    const docRef = doc(db, "orders", orderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return normalizeOrder({ id: docSnap.id, ...docSnap.data() });
    }

    return null;
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return null;
  }
};
