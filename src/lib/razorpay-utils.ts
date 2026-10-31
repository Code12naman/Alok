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
