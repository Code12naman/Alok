const IDENTIFIER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const IDENTIFIER_LENGTH = 6;

export type IdentifierPrefix = "CUS" | "ORD";

export function generateReadableIdentifier(prefix: IdentifierPrefix): string {
  const randomBytes = new Uint8Array(IDENTIFIER_LENGTH);
  globalThis.crypto.getRandomValues(randomBytes);

  const suffix = Array.from(randomBytes, (byte) => IDENTIFIER_ALPHABET[byte & 31]).join("");
  return `${prefix}-${suffix}`;
}

export function isCustomerIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^CUS-[A-HJ-NP-Z2-9]{6}$/.test(value);
}

export function isOrderIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^ORD-[A-HJ-NP-Z2-9]{6}$/.test(value);
}

