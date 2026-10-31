import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db, adminDb } from "@/firebase/config";
import { CartItem } from "@/context/CartContext";
import { Address } from "./addressService";
import { getImageUrl } from "./productService";
import { generateReadableIdentifier } from "@/lib/identifiers";

export type PaymentMethod = "Razorpay" | "COD";
export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Cancelled" | "Refunded";
export class OrderLookupError extends Error {
  code: string;

  constructor(message: string, code = "unknown") {
    super(message);
    this.name = "OrderLookupError";
    this.code = code;
  }
}
export type OrderStatus =
  | "Pending"
  | "Order Confirmed"
  | "Processing"
  | "Shipped"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export const CANONICAL_ORDER_STATUSES: readonly OrderStatus[] = [
  "Pending",
  "Order Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

/**
 * Keeps legacy Firestore documents and admin inputs compatible with the
 * canonical status written by checkout.
 */
export function normalizeOrderStatus(status: unknown): OrderStatus {
  if (status === "Confirmed") return "Order Confirmed";
  if (CANONICAL_ORDER_STATUSES.includes(status as OrderStatus)) {
    return status as OrderStatus;
  }
  return "Pending";
}

export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  Pending: ["Order Confirmed", "Cancelled"],
  "Order Confirmed": ["Processing", "Cancelled"],
  Processing: ["Shipped", "Cancelled"],
  Shipped: ["Out for Delivery", "Cancelled"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

export function getAllowedOrderStatusTransitions(status: OrderStatus): readonly OrderStatus[] {
  const current = normalizeOrderStatus(status);
  const nextStatuses = ORDER_STATUS_TRANSITIONS[current];
  return [current, ...nextStatuses];
}

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
  archivedAt?: any;
}

export interface NormalizedOrder {
  id: string; // Firestore Doc ID
  orderId: string; // e.g. ORD-K8M4T7
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
  archivedAt?: any;
}

export type FirestoreOrder = NormalizedOrder;

/**
 * Generates a short order ID with cryptographically secure randomness.
 * The Firestore document ID remains the internal identity.
 */
export function generateOrderId(): string {
  return generateReadableIdentifier("ORD");
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

  const statusVal = normalizeOrderStatus(raw.orderStatus || raw.status || "Order Confirmed");

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
    paymentStatus: raw.paymentMethod === "Razorpay" &&
      raw.paymentStatus === "Paid" &&
      !raw.paymentVerifiedAt
      ? "Pending"
      : raw.paymentStatus || "Pending",
    orderStatus: statusVal,
    status: statusVal,
    razorpayOrderId: raw.razorpayOrderId || undefined,
    razorpayPaymentId: raw.razorpayPaymentId || undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    archivedAt: raw.archivedAt,
    createdAtFormatted: formatOrderTimestamp(raw.createdAt),
    updatedAtFormatted: raw.updatedAt ? formatOrderTimestamp(raw.updatedAt) : undefined,
  };
}

/**
 * Creates a new order in Firestore and decrements inventory stock.
 */
export const createOrder = async (
  userId: string,
  _customerId: string,
  cartItems: CartItem[],
  address: Address,
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus = "Pending",
  razorpayDetails?: { razorpayOrderId?: string; razorpayPaymentId?: string },
  userEmail?: string,
  couponDetails?: { couponCode?: string; discount?: number },
  checkoutAttemptId?: string
): Promise<NormalizedOrder> => {
  if (paymentMethod !== "COD" || paymentStatus !== "Pending") {
    throw new Error("Online orders must be created by the verified server-side payment flow.");
  }
  if (!userId) {
    throw new Error("Authentication required: Order creation requires a logged-in user ID.");
  }
  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cannot create order: Shopping cart is empty.");
  }
  const profileSnapshot = await getDoc(doc(db, "users", userId));
  const profileCustomerId = profileSnapshot.data()?.customerId;
  if (!profileSnapshot.exists() || typeof profileCustomerId !== "string" || !profileCustomerId) {
    throw new Error("Customer profile is incomplete. Please refresh your account and try again.");
  }

  const orderId = checkoutAttemptId || generateOrderId();
  const email = userEmail || "";

  const aggregatedItems = new Map<string, CartItem>();
  for (const item of cartItems) {
    if (!item?.productId || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
      throw new Error("The cart contains an invalid product or quantity.");
    }
    const key = `${item.productId}__${item.size || ""}__${item.color || ""}`;
    const existing = aggregatedItems.get(key);
    if (existing) {
      existing.quantity += Number(item.quantity);
    } else {
      aggregatedItems.set(key, { ...item, quantity: Number(item.quantity) });
    }
  }
  const normalizedCartItems = [...aggregatedItems.values()];

  // Re-read products before creating the immutable order snapshot. Cart prices and
  // names are client state and must not be treated as authoritative.
  const verifiedItems = await Promise.all(
    normalizedCartItems.map(async (cartItem) => {
      const productSnapshot = await getDoc(doc(db, "products", cartItem.productId));
      if (!productSnapshot.exists()) {
        throw new Error(`The product "${cartItem.name}" is no longer available.`);
      }
      const product = productSnapshot.data();
      const stock = Number(product.stock) || 0;
      if (product.status !== "active" || stock < cartItem.quantity) {
        throw new Error(`"${product.name || cartItem.name}" is out of stock or unavailable.`);
      }
      return { cartItem, product };
    })
  );

  // 1. Audit and normalize every order item using verified product data
  const orderItems: OrderItem[] = verifiedItems.map(({ cartItem, product }) => {
    const rawImage = getImageUrl(product.images?.[0]) || product.thumbnail || cartItem.image || "";
    const item: Record<string, any> = {
      productId: cartItem.productId,
      name: product.name || cartItem.name || "Product",
      image: rawImage,
      price: Number(product.price) || 0,
      quantity: Number(cartItem.quantity),
      subtotal: (Number(product.price) || 0) * Number(cartItem.quantity),
    };

    if (cartItem.size && typeof cartItem.size === "string" && cartItem.size.trim() !== "") {
      item.size = cartItem.size.trim();
    }
    if (cartItem.color && typeof cartItem.color === "string" && cartItem.color.trim() !== "") {
      item.color = cartItem.color.trim();
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
    customerId: profileCustomerId,
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
    checkoutAttemptId: orderId,
  };

  // 5. Deep sanitization to guarantee NO undefined fields
  const sanitizedPayload = deepSanitizeFirestore(rawPayload);

  const finalPayload = {
    ...sanitizedPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = doc(collection(db, "orders"), orderId);
  const existingOrder = await getDoc(docRef);
  if (existingOrder.exists()) {
    const existingData = existingOrder.data();
    if (existingData.checkoutAttemptId === orderId || existingData.razorpayOrderId === razorpayDetails?.razorpayOrderId) {
      return normalizeOrder({ id: existingOrder.id, ...existingData });
    }
    throw new Error("This order ID already exists. Please retry the checkout.");
  }
  await runTransaction(db, async (transaction) => {
    const existingOrder = await transaction.get(docRef);
    if (existingOrder.exists()) {
      throw new Error("This order ID already exists. Please retry the checkout.");
    }

    const productSnapshots = [];
    for (const item of normalizedCartItems) {
      const productRef = doc(db, "products", item.productId);
      productSnapshots.push({ item, ref: productRef, snapshot: await transaction.get(productRef) });
    }

    for (const { item, ref, snapshot } of productSnapshots) {
      if (!snapshot.exists()) {
        throw new Error(`The product "${item.name}" is no longer available.`);
      }
      const product = snapshot.data();
      const currentPrice = Number(product.price);
      const currentStock = Number(product.stock) || 0;
      if (product.status !== "active" || !Number.isFinite(currentPrice) || currentStock < item.quantity) {
        throw new Error(`"${product.name || item.name}" is out of stock or unavailable.`);
      }
      transaction.update(ref, { stock: currentStock - item.quantity });
    }

    transaction.set(docRef, finalPayload);
  });

  const createdSnapshot = await getDoc(docRef);
  if (!createdSnapshot.exists()) {
    throw new Error("Order creation could not be confirmed. Please check My Orders before retrying.");
  }
  return normalizeOrder({ id: createdSnapshot.id, ...createdSnapshot.data() });
};

/**
 * Fetches all orders (for admin panel).
 */
export const getOrders = async (): Promise<NormalizedOrder[]> => {
  try {
    const q = query(collection(adminDb, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeOrder({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching all orders:", error);
    throw error;
  }
};

/**
 * Updates order status (for admin panel).
 */
export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<void> => {
  const docRef = doc(adminDb, "orders", id);
  await runTransaction(adminDb, async (transaction) => {
    const orderSnapshot = await transaction.get(docRef);
    if (!orderSnapshot.exists()) throw new Error("Order not found.");
    const order = orderSnapshot.data();
    const current = normalizeOrderStatus(order.orderStatus || order.status || "Pending");
    const nextStatus = normalizeOrderStatus(status);
    const transitions = ORDER_STATUS_TRANSITIONS[current];

    if (current !== nextStatus && !transitions?.includes(nextStatus)) {
      throw new Error(`Invalid order status transition from ${current} to ${nextStatus}.`);
    }

    const shouldRestoreStock = order.paymentMethod === "Razorpay"
      ? order.inventoryReserved === true || (order.inventoryReserved === undefined && !order.stockRestoredAt)
      : !order.stockRestoredAt;
    if (nextStatus === "Cancelled" && current !== "Cancelled" && shouldRestoreStock) {
      const items = Array.isArray(order.items) ? order.items : Array.isArray(order.products) ? order.products : [];
      const productSnapshots = [];
      for (const item of items) {
        if (item.productId && Number(item.quantity) > 0) {
          const productRef = doc(adminDb, "products", item.productId);
          productSnapshots.push({
            ref: productRef,
            snapshot: await transaction.get(productRef),
            quantity: Number(item.quantity),
          });
        }
      }
      for (const product of productSnapshots) {
        if (product.snapshot.exists()) {
          const stock = Number(product.snapshot.data().stock) || 0;
          transaction.update(product.ref, { stock: stock + product.quantity });
        }
      }
      transaction.update(docRef, {
        orderStatus: nextStatus,
        status: nextStatus,
        stockRestoredAt: serverTimestamp(),
        ...(order.paymentMethod === "Razorpay" ? { inventoryReserved: false } : {}),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    transaction.update(docRef, {
      orderStatus: nextStatus,
      status: nextStatus,
      ...(nextStatus === "Cancelled" && order.paymentMethod === "Razorpay" ? { inventoryReserved: false } : {}),
      updatedAt: serverTimestamp(),
    });
  });
};

/**
 * Confirms cash receipt for a pending COD order. Firestore rules enforce the
 * admin-only, COD-only, Pending -> Paid transition and audit fields.
 */
export const markCodPaymentAsPaid = async (id: string, adminUid: string): Promise<void> => {
  if (!adminUid) throw new Error("Administrator authentication is required.");

  await runTransaction(adminDb, async (transaction) => {
    const docRef = doc(adminDb, "orders", id);
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists()) throw new Error("Order not found.");

    const order = snapshot.data();
    if (order.paymentMethod !== "COD" || order.paymentStatus !== "Pending") {
      throw new Error("Only pending COD orders can be marked as paid.");
    }

    transaction.update(docRef, {
      paymentStatus: "Paid",
      paymentConfirmedAt: serverTimestamp(),
      paymentConfirmedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
  });
};

/**
 * Fetches all orders for a specific user.
 */
export const getUserOrders = async (userId: string): Promise<NormalizedOrder[]> => {
  if (!userId) {
    throw new OrderLookupError("Authentication is required to load order history.", "unauthenticated");
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
      if (indexErr?.code === "permission-denied" || indexErr?.code === "unauthenticated") {
        throw indexErr;
      }
      console.warn("[OrderService] Falling back to an unordered owner-scoped order query:", indexErr?.code || "unknown");
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
    const code = error?.code || "unknown";
    console.error("[OrderService] Failed to load owner-scoped order history:", code);
    throw new OrderLookupError(
      code === "permission-denied"
        ? "Your session is not authorized to view order history. Please sign in again."
        : "Unable to load order history. Please try again.",
      code
    );
  }
};

/**
 * Fetches an order by its unique readable orderId or Firestore document id.
 */
export const getOrderById = async (orderId: string, ownerUserId?: string, database = db): Promise<NormalizedOrder | null> => {
  if (!orderId) return null;
  try {
    if (ownerUserId) {
      const directSnapshot = await getDoc(doc(database, "orders", orderId));
      if (directSnapshot.exists()) {
        const directData = directSnapshot.data();
        if (directData.userId === ownerUserId) {
          return normalizeOrder({ id: directSnapshot.id, ...directData });
        }
        return null;
      }

      const ownedOrders = await getDocs(query(collection(database, "orders"), where("userId", "==", ownerUserId)));
      const ownedOrder = ownedOrders.docs.find((candidate) => {
        const data = candidate.data();
        return data.orderId === orderId || data.orderNumber === orderId || candidate.id === orderId;
      });
      return ownedOrder ? normalizeOrder({ id: ownedOrder.id, ...ownedOrder.data() }) : null;
    }

    const directSnapshot = await getDoc(doc(database, "orders", orderId));
    if (directSnapshot.exists()) {
      return normalizeOrder({ id: directSnapshot.id, ...directSnapshot.data() });
    }

    const orderIdSnapshot = await getDocs(
      query(collection(database, "orders"), where("orderId", "==", orderId))
    );
    if (!orderIdSnapshot.empty) {
      const d = orderIdSnapshot.docs[0];
      return normalizeOrder({ id: d.id, ...d.data() });
    }

    const orderNumberSnapshot = await getDocs(
      query(collection(database, "orders"), where("orderNumber", "==", orderId))
    );
    if (!orderNumberSnapshot.empty) {
      const d = orderNumberSnapshot.docs[0];
      return normalizeOrder({ id: d.id, ...d.data() });
    }

    return null;
  } catch (error) {
    const code = (error as { code?: string })?.code || "unknown";
    console.error("[OrderService] Failed to load owner-scoped order:", code);
    throw new OrderLookupError(
      code === "permission-denied"
        ? "Your session is not authorized to view this order. Please sign in again."
        : "Unable to load this order. Please try again.",
      code
    );
  }
};
