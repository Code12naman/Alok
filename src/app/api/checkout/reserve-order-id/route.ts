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

function isValidOrderId(value: unknown): value is string {
  return isOrderIdentifier(value) || (typeof value === "string" && /^CT-ORD-\d{8}-[A-F0-9]{8}$/.test(value));
}

export async function POST(request: Request) {
  let stage = "authentication";
  try {
    const uid = await verifyFirebaseBearerToken(request);
    stage = "rate-limit";
    await enforcePaymentRateLimit(uid, "reserve");
    let body: { orderId?: unknown; attemptKey?: unknown };
    try {
      body = await request.json() as { orderId?: unknown; attemptKey?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid order reservation request." }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid order reservation request." }, { status: 400 });
    }
    if (!isValidOrderId(body.orderId)) {
      return NextResponse.json({ error: "A valid order ID is required." }, { status: 400 });
    }
    const attemptKey = typeof body.attemptKey === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.attemptKey)
      ? body.attemptKey
      : body.orderId;

    stage = "reserve-order-id";
    const db = getAdminDb();
    const orderId = body.orderId;
    const orderRef = db.collection("orders").doc(orderId);
    const reservationRef = db.collection("orderIdReservations").doc(orderId);
    const isReserved = await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      const reservationSnapshot = await transaction.get(reservationRef);

      if (orderSnapshot.exists) {
        const existing = orderSnapshot.data() || {};
        return isSameOrderAttempt(existing, uid, orderId, attemptKey);
      }
      if (reservationSnapshot.exists) {
        const reservation = reservationSnapshot.data() || {};
        return ownsOrderIdReservation(reservation, uid, orderId, attemptKey);
      }

      transaction.set(reservationRef, {
        userId: uid,
        attemptKey,
        createdAt: FieldValue.serverTimestamp(),
      });
      return true;
    });

    if (!isReserved) {
      return NextResponse.json({ error: "This order ID is already in use. Please retry checkout." }, { status: 409 });
    }
    return NextResponse.json({ orderId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to reserve an order ID.";
    const status = error instanceof PaymentRateLimitError
      ? 429
      : /Authentication|token/i.test(message)
        ? 401
        : 500;
    logPaymentRouteFailure(stage, error);
    return NextResponse.json({ error: message }, { status });
  }
}
