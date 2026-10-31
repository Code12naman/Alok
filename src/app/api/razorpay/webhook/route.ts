import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getRazorpayClient } from "@/lib/razorpay-server";
import { recordCapturedPayment, recordFailedPayment } from "@/lib/razorpay-order-state";
import { verifyRazorpayHmac } from "@/lib/razorpay-utils";

export const runtime = "nodejs";

interface RazorpayWebhookBody {
  event?: unknown;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    order?: { entity?: Record<string, unknown> };
  };
}

function providerId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_]{5,64}$/.test(value);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) {
    return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
  }
  if (!verifyRazorpayHmac(rawBody, request.headers.get("x-razorpay-signature"), webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(rawBody) as RazorpayWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const eventType = body.event;
  if (!["payment.captured", "payment.failed", "order.paid"].includes(String(eventType))) {
    return NextResponse.json({ received: true });
  }

  const eventId = request.headers.get("x-razorpay-event-id") || createHash("sha256").update(rawBody).digest("hex");
  const eventRefId = createHash("sha256").update(eventId).digest("hex");
  const db = getAdminDb();
  const eventReceipt = {
    ref: db.collection("razorpayWebhookEvents").doc(eventRefId),
    eventType: String(eventType),
  };

  try {
    let payment = body.payload?.payment?.entity;
    if (eventType === "order.paid") {
      const eventOrderId = body.payload?.order?.entity?.id ?? payment?.order_id;
      if (!providerId(eventOrderId)) {
        return NextResponse.json({ error: "Webhook payment order is missing." }, { status: 400 });
      }
      const payments = await getRazorpayClient().orders.fetchPayments(eventOrderId);
      payment = payments.items.find((item) => item.status === "captured") as unknown as Record<string, unknown> | undefined;
      if (!payment) {
        return NextResponse.json({ error: "Captured payment is not available yet." }, { status: 503 });
      }
    }

    const razorpayOrderId = payment?.order_id ?? body.payload?.order?.entity?.id;
    if (!providerId(razorpayOrderId)) {
      return NextResponse.json({ error: "Webhook payment order is missing." }, { status: 400 });
    }

    const orders = await db.collection("orders")
      .where("razorpayOrderId", "==", razorpayOrderId)
      .limit(1)
      .get();
    if (orders.empty) {
      return NextResponse.json({ error: "Payment order is not linked yet." }, { status: 503 });
    }

    const internalOrderId = orders.docs[0].id;
    if (eventType === "payment.failed") {
      if (!payment || !providerId(payment.id) || payment.status !== "failed" || payment.order_id !== razorpayOrderId) {
        return NextResponse.json({ error: "Webhook payment details are missing." }, { status: 400 });
      }
      await recordFailedPayment(
        db,
        internalOrderId,
        razorpayOrderId,
        payment.id,
        typeof payment.error_code === "string" ? payment.error_code.slice(0, 100) : null,
        eventReceipt
      );
      return NextResponse.json({ received: true });
    }

    if (
      !payment ||
      !providerId(payment.id) ||
      payment.order_id !== razorpayOrderId ||
      payment.status !== "captured" ||
      payment.currency !== "INR"
    ) {
      return NextResponse.json({ error: "Webhook does not contain a captured INR payment." }, { status: 400 });
    }

    await recordCapturedPayment(
      db,
      internalOrderId,
      {
        id: payment.id,
        order_id: razorpayOrderId,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
      },
      undefined,
      undefined,
      eventReceipt
    );
    return NextResponse.json({ received: true });
  } catch {
    console.error("Razorpay webhook processing failed.");
    return NextResponse.json({ error: "Webhook processing failed; Razorpay may retry this event." }, { status: 500 });
  }
}
