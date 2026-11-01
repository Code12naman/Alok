import "server-only";

import { createHash } from "node:crypto";
import Razorpay from "razorpay";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  getRazorpayErrorDetails,
  missingRazorpayCredentials,
} from "@/lib/razorpay-utils";

export class PaymentRateLimitError extends Error {
  constructor() {
    super("Too many payment requests. Please wait a moment and try again.");
    this.name = "PaymentRateLimitError";
  }
}

export function getRazorpayKeyId(): string {
  const missing = missingRazorpayCredentials(process.env);
  if (missing.length) {
    throw new Error(`Razorpay is not configured. Missing: ${missing.join(", ")}.`);
  }
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("Razorpay is not configured.");
  return keyId;
}

export function getRazorpayClient(): Razorpay {
  const keyId = getRazorpayKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error("Razorpay is not configured.");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function logPaymentRouteFailure(
  stage: string,
  error: unknown,
  correlationId?: string
): void {
  const details = getRazorpayErrorDetails(error);
  const safeText = (message: string) =>
    [
      process.env.RAZORPAY_KEY_SECRET,
      process.env.RAZORPAY_WEBHOOK_SECRET,
      process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    ]
      .filter((secret): secret is string => Boolean(secret))
      .reduce((safeMessage, secret) => safeMessage.split(secret).join("[redacted-secret]"), message)
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
      .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[redacted-phone]")
      .replace(/\b(?:rzp_(?:test|live)_[A-Za-z0-9]+|pay_[A-Za-z0-9]+|order_[A-Za-z0-9]+)\b/g, "[redacted-payment-id]")
      .replace(/\b(?:signature|secret|authorization|token)\s*[:=]\s*\S+/gi, "[redacted]")
      .slice(0, 300);
  const safeErrorMessage = error instanceof Error
    ? safeText(error.message)
    : typeof details.description === "string"
      ? safeText(details.description)
      : "Unknown error";
  const code = details.code && /^[A-Z0-9_-]{1,60}$/i.test(details.code)
    ? details.code
    : undefined;
  const reason = details.reason && /^[A-Z0-9_-]{1,60}$/i.test(details.reason)
    ? details.reason
    : undefined;
  const status = details.statusCode
    || (error instanceof PaymentRateLimitError
      ? 429
      : error instanceof Error && /not configured/i.test(error.message)
        ? 503
        : error instanceof Error && /authentication|token/i.test(error.message)
          ? 401
          : undefined);

  console.error("Checkout API failed", {
    ...(correlationId ? { correlationId } : {}),
    stage,
    errorType: error instanceof Error ? error.name : typeof error,
    errorMessage: safeErrorMessage,
    ...(code ? { errorCode: code } : {}),
    ...(details.description ? { razorpayDescription: safeText(details.description) } : {}),
    ...(reason ? { errorReason: reason } : {}),
    ...(status ? { httpStatus: status } : {}),
  });
}

export async function enforcePaymentRateLimit(
  uid: string,
  operation: string,
  limit = 20,
  windowMs = 60_000
): Promise<void> {
  const db = getAdminDb();
  const hashedUid = createHash("sha256").update(uid).digest("hex");
  const limitRef = db.collection("paymentRateLimits").doc(`${operation}_${hashedUid}`);
  const now = Date.now();

  const allowed = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(limitRef);
    const current = snapshot.data() || {};
    const startedAt = Number(current.windowStartedAt) || now;
    const count = now - startedAt >= windowMs ? 0 : Number(current.count) || 0;
    if (count >= limit) return false;

    transaction.set(limitRef, {
      windowStartedAt: count === 0 ? now : startedAt,
      count: count + 1,
    });
    return true;
  });

  if (!allowed) throw new PaymentRateLimitError();
}
