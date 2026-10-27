import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { verifyFirebaseBearerToken } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { isOrderIdentifier } from "@/lib/identifiers";
import { isSameOrderAttempt, ownsOrderIdReservation } from "@/lib/order-id-reservation";

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
  paymentMethod?: "COD" | "Razorpay";
  paymentStatus?: "Pending" | "Paid";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
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
  try {
    const uid = await verifyFirebaseBearerToken(request);
    const body = (await request.json()) as CreateOrderBody;
    const items = Array.isArray(body.items) ? body.items : [];
    const addressId = cleanString(body.addressId);
    const paymentMethod = body.paymentMethod;
    const paymentStatus = body.paymentStatus;

    if (!validOrderId(body.checkoutAttemptId)) {
      return NextResponse.json({ error: "A valid checkout order ID is required." }, { status: 400 });
    }
    if (!items.length || !addressId || !paymentMethod || !paymentStatus) {
      return NextResponse.json({ error: "Order details are incomplete." }, { status: 400 });
    }
    if (
      (paymentMethod === "COD" && paymentStatus !== "Pending") ||
      (paymentMethod === "Razorpay" && paymentStatus !== "Paid") ||
      !["COD", "Razorpay"].includes(paymentMethod)
    ) {
      return NextResponse.json({ error: "Invalid payment state." }, { status: 400 });
    }
    if (paymentMethod === "Razorpay" && (!cleanString(body.razorpayOrderId) || !cleanString(body.razorpayPaymentId))) {
      return NextResponse.json({ error: "Verified payment details are required." }, { status: 400 });
    }

    const aggregated = new Map<string, CheckoutItem & { quantity: number }>();
    for (const item of items) {
      const productId = cleanString(item.productId);
      const quantity = Number(item.quantity);
      const size = cleanString(item.size);
      const color = cleanString(item.color);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json({ error: "Cart contains an invalid product or quantity." }, { status: 400 });
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
    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(orderId);
    const reservationRef = db.collection("orderIdReservations").doc(orderId);
    const profileRef = db.collection("users").doc(uid);
    const addressRef = profileRef.collection("addresses").doc(addressId);
    const productRefs = [...aggregated.values()].map((item) => ({
      item,
      ref: db.collection("products").doc(item.productId!),
    }));
    let verifiedProviderAmount: number | undefined;

    if (paymentMethod === "Razorpay") {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const signature = cleanString(body.razorpaySignature);
      if (!keySecret || !keyId || !signature) {
        return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
      }
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
        .digest("hex");
      if (
        signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
      ) {
        return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
      }
      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
      const [orderResponse, paymentResponse] = await Promise.all([
        fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(cleanString(body.razorpayOrderId))}`, {
          headers: { Authorization: authHeader },
        }),
        fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(cleanString(body.razorpayPaymentId))}`, {
          headers: { Authorization: authHeader },
        }),
      ]);
      if (!orderResponse.ok || !paymentResponse.ok) {
        return NextResponse.json({ error: "Unable to confirm payment with Razorpay." }, { status: 502 });
      }
      const razorpayOrder = await orderResponse.json();
      const payment = await paymentResponse.json();
      verifiedProviderAmount = Number(razorpayOrder.amount);
      if (
        razorpayOrder.notes?.userId !== uid ||
        razorpayOrder.notes?.checkoutAttemptId !== orderId ||
        (body.checkoutAttemptKey && razorpayOrder.notes?.checkoutAttemptKey !== body.checkoutAttemptKey) ||
        payment.order_id !== body.razorpayOrderId ||
        payment.status !== "captured" ||
        payment.currency !== "INR" ||
        Number(payment.amount) !== Number(razorpayOrder.amount)
      ) {
        return NextResponse.json({ error: "Payment details did not pass server verification." }, { status: 400 });
      }
    }

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
      if (paymentMethod === "Razorpay") {
        const expectedAmount = Math.round(finalAmount * 100);
        if (expectedAmount <= 0 || expectedAmount !== verifiedProviderAmount) {
          throw new Error("Payment amount does not match the current cart.");
        }
      }
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
        paymentStatus,
        orderStatus: "Order Confirmed",
        status: "Order Confirmed",
        checkoutAttemptId: orderId,
        checkoutAttemptKey: attemptKey,
        ...(paymentMethod === "Razorpay"
          ? { razorpayOrderId: cleanString(body.razorpayOrderId), razorpayPaymentId: cleanString(body.razorpayPaymentId) }
          : {}),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ orderId });
  } catch (error: unknown) {
    console.error("Checkout order creation failed:", error instanceof Error ? error.message : "unknown error");
    const message = error instanceof Error ? error.message : "Unable to create order.";
    const status = message.includes("Authentication") || message.includes("token") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
