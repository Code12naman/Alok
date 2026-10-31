export function safePaymentErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  return message
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[redacted-phone]")
    .replace(/\b(?:rzp_(?:test|live)_[A-Za-z0-9]+|pay_[A-Za-z0-9]+|order_[A-Za-z0-9]+)\b/g, "[redacted-payment-id]")
    .replace(/\b(signature|secret|authorization|token)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 300);
}
