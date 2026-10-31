import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyFirebaseBearerToken } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { isOrderIdentifier } from "@/lib/identifiers";
import { isSameOrderAttempt, ownsOrderIdReservation } from "@/lib/order-id-reservation";
import {
  enforcePaymentRateLimit,
  logPaymentRouteFailure,
  PaymentRateLimitError,
} from "@/lib/razorpay-server";

export const runtime = "nodejs";

interface CheckoutItem {
  productId?: string;
  quantity?: number | string;
  size?: string;
  color?: string;
  name?: string;
}

interface CreateOrderBody {
  items?: CheckoutItem[];
  addressId?: string;
  paymentMethod?: "COD";
  checkoutAttemptId?: string;
  checkoutAttemptKey?: string;
}

function validOrderId(value: unknown): value is string {
  return isOrderIdentifier(value) || (typeof value === "string" && /^CT-ORD-\d{8}-[A-F0-9]{8}$/.test(value));
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let stage = "authentication";
  try {
    const uid = await verifyFirebaseBearerToken(request);
    stage = "rate-limit";
    await enforcePaymentRateLimit(uid, "create");
    let body: CreateOrderBody;
    try {
      body = await request.json() as CreateOrderBody;
    } catch {
      return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
    }
    const items = Array.isArray(body.items) ? body.items : [];
    const addressId = cleanString(body.addressId);
    const paymentMethod = body.paymentMethod;

    if (!validOrderId(body.checkoutAttemptId)) {
      return NextResponse.json({ error: "A valid checkout order ID is required." }, { status: 400 });
    }
    if (!items.length || items.length > 50 || !/^[A-Za-z0-9_-]{1,128}$/.test(addressId) || paymentMethod !== "COD") {
      return NextResponse.json({ error: "Order details are incomplete." }, { status: 400 });
    }

    const aggregated = new Map<string, CheckoutItem & { quantity: number }>();
    let totalQuantity = 0;
    for (const item of items) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: "Cart contains an invalid item." }, { status: 400 });
      }
      const productId = cleanString(item.productId);
      const quantity = Number(item.quantity);
      const size = cleanString(item.size).slice(0, 80);
      const color = cleanString(item.color).slice(0, 80);
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        return NextResponse.json({ error: "Cart contains an invalid product or quantity." }, { status: 400 });
      }
      totalQuantity += quantity;
      if (totalQuantity > 100) {
        return NextResponse.json({ error: "Cart contains too many items." }, { status: 400 });
      }
      const key = `${productId}__${size}__${color}`;
      const existing = aggregated.get(key);
      if (existing) existing.quantity += quantity;
      else aggregated.set(key, { ...item, productId, quantity, size, color });
    }

    const orderId = body.checkoutAttemptId;
    const attemptKey = typeof body.checkoutAttemptKey === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.checkoutAttemptKey)
      ? body.checkoutAttemptKey
      : orderId;
    stage = "load-checkout-records";
    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(orderId);
    const reservationRef = db.collection("orderIdReservations").doc(orderId);
    const profileRef = db.collection("users").doc(uid);
    const addressRef = profileRef.collection("addresses").doc(addressId);
    const productRefs = [...aggregated.values()].map((item) => ({
      item,
      ref: db.collection("products").doc(item.productId!),
    }));

    stage = "reserve-inventory-and-create-cod-order";
    await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      const reservationSnapshot = await transaction.get(reservationRef);
      if (orderSnapshot.exists) {
        const existing = orderSnapshot.data() || {};
        if (isSameOrderAttempt(existing, uid, orderId, attemptKey)) return;
        throw new Error("This order ID already exists. Please retry checkout.");
      }

      const reservation = reservationSnapshot.data() || {};
      if (reservationSnapshot.exists && !ownsOrderIdReservation(reservation, uid, orderId, attemptKey)) {
        throw new Error("This order ID is already reserved. Please retry checkout.");
      }
      const profileSnapshot = await transaction.get(profileRef);
      const addressSnapshot = await transaction.get(addressRef);
      const productSnapshots = [];
      for (const { ref } of productRefs) {
        productSnapshots.push(await transaction.get(ref));
      }
      if (!profileSnapshot.exists || !addressSnapshot.exists) {
        throw new Error("The selected delivery address is no longer available.");
      }

      const profile = profileSnapshot.data() || {};
      const address = addressSnapshot.data() || {};
      if (typeof profile.customerId !== "string" || !profile.customerId) {
        throw new Error("Customer profile is incomplete. Please refresh your account and try again.");
      }

      const verifiedItems = productSnapshots.map((snapshot, index) => {
        const product = snapshot.data() || {};
        const item = productRefs[index].item;
        const stock = Number(product.stock);
        const price = Number(product.price);
        const sizes = Array.isArray(product.sizes) ? product.sizes.map(String) : [];
        const colors = Array.isArray(product.colors) ? product.colors.map(String) : [];
        if (
          !snapshot.exists ||
          product.status !== "active" ||
          !Number.isFinite(price) ||
          price < 0 ||
          !Number.isFinite(stock) ||
          stock < item.quantity ||
          (item.size && sizes.length > 0 && !sizes.includes(item.size)) ||
          (item.color && colors.length > 0 && !colors.includes(item.color))
        ) {
          throw new Error(`"${product.name || item.name || "Product"}" is unavailable or out of stock.`);
        }
        return {
          product,
          item,
          price,
          stock,
          subtotal: price * item.quantity,
        };
      });

      const orderItems = verifiedItems.map(({ product, item, price, subtotal }) => ({
        productId: item.productId,
        name: cleanString(product.name) || cleanString(item.name) || "Product",
        image: Array.isArray(product.images) ? cleanString(product.images[0]) : cleanString(product.thumbnail),
        price,
        quantity: item.quantity,
        ...(item.size ? { size: item.size } : {}),
        ...(item.color ? { color: item.color } : {}),
        subtotal,
      }));
      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const deliveryCharge = subtotal >= 999 ? 0 : 99;
      const finalAmount = subtotal + deliveryCharge;
      const shippingAddress = {
        fullName: cleanString(address.fullName),
        phone: cleanString(address.phone),
        building: cleanString(address.building || address.addressLine1),
        street: cleanString(address.street || address.addressLine2),
        addressLine1: cleanString(address.addressLine1 || address.building),
        addressLine2: cleanString(address.addressLine2 || address.street),
        city: cleanString(address.city),
        state: cleanString(address.state),
        pinCode: cleanString(address.pinCode || address.postalCode),
        postalCode: cleanString(address.postalCode || address.pinCode),
        country: cleanString(address.country) || "India",
        ...(cleanString(address.landmark) ? { landmark: cleanString(address.landmark) } : {}),
      };

      for (const { ref, item, stock } of verifiedItems.map((entry, index) => ({
        ref: productRefs[index].ref,
        item: entry.item,
        stock: entry.stock,
      }))) {
        transaction.update(ref, { stock: stock - item.quantity, updatedAt: FieldValue.serverTimestamp() });
      }
      if (!reservationSnapshot.exists) {
        transaction.set(reservationRef, {
          userId: uid,
          attemptKey,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.set(orderRef, {
        orderNumber: orderId,
        orderId,
        userId: uid,
        customerId: profile.customerId,
        customer: {
          name: shippingAddress.fullName || "Customer",
          email: cleanString(profile.email),
          phone: shippingAddress.phone,
        },
        shippingAddress,
        deliveryAddress: shippingAddress,
        items: orderItems,
        products: orderItems,
        subtotal,
        discount: 0,
        couponCode: "",
        deliveryCharge,
        finalAmount,
        totalAmount: finalAmount,
        customerName: shippingAddress.fullName,
        customerEmail: cleanString(profile.email),
        paymentMethod,
        paymentStatus: "Pending",
        orderStatus: "Order Confirmed",
        status: "Order Confirmed",
        checkoutAttemptId: orderId,
        checkoutAttemptKey: attemptKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ orderId });
  } catch (error: unknown) {
    if (error instanceof PaymentRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    logPaymentRouteFailure(stage, error);
    const message = error instanceof Error ? error.message : "Unable to create order.";
    const status = message.includes("Authentication") || message.includes("token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
