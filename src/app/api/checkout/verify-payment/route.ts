import { NextResponse } from "next/server";
import { verifyFirebaseBearerToken } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  enforcePaymentRateLimit,
  getRazorpayClient,
  getRazorpayKeyId,
  logPaymentRouteFailure,
  PaymentRateLimitError,
} from "@/lib/razorpay-server";
import { recordCapturedPayment } from "@/lib/razorpay-order-state";
import { verifyRazorpayHmac } from "@/lib/razorpay-utils";
import { isOrderIdentifier } from "@/lib/identifiers";

export const runtime = "nodejs";

interface VerificationBody {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
  checkoutAttemptId?: unknown;
  checkoutAttemptKey?: unknown;
}

function isProviderId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_]{5,64}$/.test(value);
}

export async function POST(request: Request) {
  let stage = "authentication";
  try {
    const uid = await verifyFirebaseBearerToken(request);
    stage = "rate-limit";
    await enforcePaymentRateLimit(uid, "verify");

    let body: VerificationBody;
    try {
      body = await request.json() as VerificationBody;
    } catch {
      return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
    }

    const providerOrderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;
    const internalOrderId = body.checkoutAttemptId;
    const attemptKey = body.checkoutAttemptKey;
    if (
      !isProviderId(providerOrderId) ||
      !isProviderId(paymentId) ||
      typeof signature !== "string" ||
      !isOrderIdentifier(internalOrderId) ||
      typeof attemptKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptKey)
    ) {
      return NextResponse.json({ error: "Payment verification details are invalid.", verified: false }, { status: 400 });
    }

    stage = "razorpay-configuration";
    getRazorpayKeyId();
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay verification is not configured.", verified: false }, { status: 503 });
    }
    if (!verifyRazorpayHmac(`${providerOrderId}|${paymentId}`, signature, keySecret)) {
      return NextResponse.json({ error: "Payment signature verification failed.", verified: false }, { status: 400 });
    }

    stage = "load-internal-order";
    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(internalOrderId);
    const internalOrderSnapshot = await orderRef.get();
    const internalOrder = internalOrderSnapshot.data() || {};
    if (
      !internalOrderSnapshot.exists ||
      internalOrder.userId !== uid ||
      internalOrder.checkoutAttemptKey !== attemptKey ||
      internalOrder.paymentMethod !== "Razorpay" ||
      internalOrder.razorpayOrderId !== providerOrderId
    ) {
      return NextResponse.json({ error: "Payment does not match your checkout order.", verified: false }, { status: 400 });
    }

    stage = "verify-provider-payment";
    const client = getRazorpayClient();
    const [providerOrder, payment] = await Promise.all([
      client.orders.fetch(providerOrderId),
      client.payments.fetch(paymentId),
    ]);
    if (
      providerOrder.notes?.userId !== uid ||
      providerOrder.notes?.checkoutAttemptId !== internalOrderId ||
      providerOrder.notes?.checkoutAttemptKey !== attemptKey ||
      providerOrder.amount !== Number(internalOrder.amountPaise) ||
      providerOrder.currency !== "INR" ||
      payment.id !== paymentId ||
      payment.order_id !== providerOrderId ||
      payment.amount !== Number(internalOrder.amountPaise) ||
      payment.currency !== "INR"
    ) {
      return NextResponse.json({ error: "Payment details do not match the reserved order.", verified: false }, { status: 400 });
    }
    if (payment.status !== "captured") {
      return NextResponse.json(
        { error: "Payment is not captured yet. The order will update after Razorpay confirms it.", verified: false },
        { status: 409 }
      );
    }

    stage = "record-verified-payment";
    await recordCapturedPayment(db, internalOrderId, payment, uid, attemptKey);
    return NextResponse.json({ verified: true, orderId: internalOrderId });
  } catch (error: unknown) {
    if (error instanceof PaymentRateLimitError) {
      return NextResponse.json({ error: error.message, verified: false }, { status: 429 });
    }
    if (error instanceof Error && /authentication|token/i.test(error.message)) {
      return NextResponse.json({ error: error.message, verified: false }, { status: 401 });
    }
    if (error instanceof Error && /not configured/i.test(error.message)) {
      logPaymentRouteFailure(stage, error);
      return NextResponse.json({ error: error.message, verified: false }, { status: 503 });
    }
    logPaymentRouteFailure(stage, error);
    return NextResponse.json({ error: "Unable to verify payment with Razorpay.", verified: false }, { status: 502 });
  }
}
