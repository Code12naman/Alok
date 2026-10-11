import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyFirebaseBearerToken } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const uid = await verifyFirebaseBearerToken(request);
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, checkoutAttemptId } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay verification is not configured.", verified: false },
        { status: 503 }
      );
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment verification parameters", verified: false },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Payment item details are required.", verified: false }, { status: 400 });
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const receivedSignature = Buffer.from(String(razorpay_signature), "utf8");
    const expectedSignature = Buffer.from(generatedSignature, "utf8");
    const signaturesMatch =
      receivedSignature.length === expectedSignature.length &&
      crypto.timingSafeEqual(expectedSignature, receivedSignature);
    if (!signaturesMatch) {
      return NextResponse.json(
        { error: "Invalid payment signature verification failed", verified: false },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!keyId || !projectId) {
      return NextResponse.json({ error: "Payment verification is not configured.", verified: false }, { status: 503 });
    }

    const razorpayAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const providerHeaders = { Authorization: `Basic ${razorpayAuth}` };
    const [orderResponse, paymentResponse] = await Promise.all([
      fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`, { headers: providerHeaders }),
      fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, { headers: providerHeaders }),
    ]);
    if (!orderResponse.ok || !paymentResponse.ok) {
      return NextResponse.json({ error: "Unable to confirm payment with Razorpay.", verified: false }, { status: 502 });
    }

    const razorpayOrder = await orderResponse.json();
    const payment = await paymentResponse.json();
    if (
      razorpayOrder.notes?.userId !== uid ||
      (checkoutAttemptId && razorpayOrder.notes?.checkoutAttemptId !== checkoutAttemptId) ||
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      Number(payment.amount) !== Number(razorpayOrder.amount) ||
      payment.currency !== "INR"
    ) {
      return NextResponse.json({ error: "Payment details did not pass server verification.", verified: false }, { status: 400 });
    }

    const aggregatedItems = new Map<string, number>();
    for (const item of items) {
      const productId = typeof item?.productId === "string" ? item.productId.trim() : "";
      const quantity = Number(item?.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json({ error: "Invalid payment item details.", verified: false }, { status: 400 });
      }
      aggregatedItems.set(productId, (aggregatedItems.get(productId) || 0) + quantity);
    }

    let subtotal = 0;
    for (const [productId, quantity] of aggregatedItems) {
      const productResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${encodeURIComponent(productId)}`
      );
      if (!productResponse.ok) {
        return NextResponse.json({ error: "A product is no longer available.", verified: false }, { status: 400 });
      }
      const product = await productResponse.json();
      const fields = product.fields || {};
      const readValue = (value: { stringValue?: string; integerValue?: string; doubleValue?: number } | undefined) =>
        value?.stringValue ?? (value?.integerValue !== undefined ? Number(value.integerValue) : value?.doubleValue);
      const price = Number(readValue(fields.price));
      const stock = Number(readValue(fields.stock) || 0);
      if (readValue(fields.status) !== "active" || !Number.isFinite(price) || stock < quantity) {
        return NextResponse.json({ error: "A product is unavailable or out of stock.", verified: false }, { status: 400 });
      }
      subtotal += price * quantity;
    }
    const expectedAmount = Math.round((subtotal + (subtotal >= 999 ? 0 : 99)) * 100);
    if (expectedAmount !== Number(razorpayOrder.amount)) {
      return NextResponse.json({ error: "Payment amount does not match the current cart.", verified: false }, { status: 400 });
    }

    return NextResponse.json({ verified: true });
  } catch (error: unknown) {
    console.error("Error verifying payment signature:", error);
    const message = error instanceof Error ? error.message : "Server error verifying signature";
    const status = message.includes("Authentication") || message.includes("token")
      ? 401
      : message.includes("not configured")
        ? 503
        : 500;
    return NextResponse.json(
      { error: message, verified: false },
      { status }
    );
  }
}
