import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyRazorpayHmac(
  payload: string,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!signature || !/^[a-f\d]{64}$/i.test(signature) || !secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(expected, received);
}

export function toPaise(amountInRupees: number): number | null {
  if (!Number.isFinite(amountInRupees) || amountInRupees < 0) return null;
  const amountInPaise = Math.round(amountInRupees * 100);
  return Number.isSafeInteger(amountInPaise) ? amountInPaise : null;
}

export function checkoutDeliveryChargePaise(subtotalPaise: number): number {
  return subtotalPaise >= 99_900 ? 0 : 9_900;
}

export function missingRazorpayCredentials(
  env: Record<string, string | undefined>
): string[] {
  return ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]
    .filter((name) => !env[name]?.trim());
}

export interface RazorpayErrorDetails {
  statusCode?: number;
  code?: string;
  description?: string;
  reason?: string;
}

export function getRazorpayErrorDetails(error: unknown): RazorpayErrorDetails {
  if (!error || typeof error !== "object") return {};
  const value = error as Record<string, unknown>;
  const providerError = value.error && typeof value.error === "object"
    ? value.error as Record<string, unknown>
    : {};
  const statusCode = typeof value.statusCode === "number"
    ? value.statusCode
    : typeof value.status === "number"
      ? value.status
      : undefined;
  const code = typeof providerError.code === "string"
    ? providerError.code
    : typeof value.code === "string"
      ? value.code
      : undefined;
  const description = typeof providerError.description === "string"
    ? providerError.description
    : typeof value.message === "string"
      ? value.message
      : undefined;
  const reason = typeof providerError.reason === "string"
    ? providerError.reason
    : undefined;

  return {
    ...(statusCode ? { statusCode } : {}),
    ...(code ? { code } : {}),
    ...(description ? { description } : {}),
    ...(reason ? { reason } : {}),
  };
}

export function getPaymentInitializationStatus(error: unknown): number {
  const { statusCode } = getRazorpayErrorDetails(error);
  if (statusCode === 401 || statusCode === 403 || statusCode === 429) return 503;
  if (statusCode && statusCode >= 400 && statusCode < 600) return 502;
  return 500;
}
