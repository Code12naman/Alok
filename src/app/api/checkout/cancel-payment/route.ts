import { NextResponse } from "next/server";
import { verifyFirebaseBearerToken } from "@/lib/server-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { isOrderIdentifier } from "@/lib/identifiers";
import {
  enforcePaymentRateLimit,
  getRazorpayClient,
  logPaymentRouteFailure,
  PaymentRateLimitError,
} from "@/lib/razorpay-server";
import { cancelUnpaidOrder, recordCapturedPayment } from "@/lib/razorpay-order-state";

export const runtime = "nodejs";

interface CancelBody {
  orderId?: unknown;
  attemptKey?: unknown;
}

export async function POST(request: Request) {
  let stage = "authentication";
  try {
    const uid = await verifyFirebaseBearerToken(request);
    stage = "rate-limit";
    await enforcePaymentRateLimit(uid, "cancel");

    let body: CancelBody;
    try {
      body = await request.json() as CancelBody;
    } catch {
      return NextResponse.json({ error: "Invalid cancellation request." }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid cancellation request." }, { status: 400 });
    }

    if (
      !isOrderIdentifier(body.orderId) ||
      typeof body.attemptKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.attemptKey)
    ) {
      return NextResponse.json({ error: "Checkout cancellation details are invalid." }, { status: 400 });
    }

    stage = "load-internal-order";
    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(body.orderId);
    const orderSnapshot = await orderRef.get();
    const order = orderSnapshot.data() || {};
    if (
      !orderSnapshot.exists ||
      order.userId !== uid ||
      order.checkoutAttemptKey !== body.attemptKey ||
      order.paymentMethod !== "Razorpay"
    ) {
      return NextResponse.json({ error: "Payment order was not found." }, { status: 404 });
    }

    if (typeof order.razorpayOrderId !== "string") {
      return NextResponse.json({ error: "Payment order is still initializing. Please retry shortly." }, { status: 409 });
    }

    stage = "check-provider-payment-state";
    const client = getRazorpayClient();
    const providerPayments = await client.orders.fetchPayments(order.razorpayOrderId);
    const capturedPayment = providerPayments.items.find((payment) => payment.status === "captured");
    if (capturedPayment) {
      await recordCapturedPayment(db, body.orderId, capturedPayment, uid, body.attemptKey);
      return NextResponse.json({ cancelled: false, paid: true, orderId: body.orderId });
    }
    if (providerPayments.items.some((payment) => payment.status === "authorized")) {
      return NextResponse.json(
        { error: "Payment is processing. The order will update after Razorpay confirms the result." },
        { status: 409 }
      );
    }

    stage = "release-inventory-and-cancel";
    const result = await cancelUnpaidOrder(db, body.orderId, uid, body.attemptKey);
    if (result === "not_found") {
      return NextResponse.json({ error: "Payment order was not found." }, { status: 404 });
    }
    return NextResponse.json({ cancelled: result === "cancelled", paid: result === "paid", orderId: body.orderId });
  } catch (error: unknown) {
    if (error instanceof PaymentRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof Error && /authentication|token/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && /not configured/i.test(error.message)) {
      logPaymentRouteFailure(stage, error);
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    logPaymentRouteFailure(stage, error);
    return NextResponse.json({ error: "Unable to cancel checkout." }, { status: 502 });
  }
}
