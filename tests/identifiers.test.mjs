import assert from "node:assert/strict";
import test from "node:test";
import { generateReadableIdentifier, isCustomerIdentifier, isOrderIdentifier } from "../src/lib/identifiers.ts";
import { getFlashSaleCountdown, parseFlashSaleEndAt } from "../src/lib/flash-sale.ts";
import { isSameOrderAttempt, ownsOrderIdReservation } from "../src/lib/order-id-reservation.ts";
import { createHmac } from "node:crypto";
import {
  getPaymentInitializationStatus,
  getRazorpayErrorDetails,
  missingRazorpayCredentials,
  toPaise,
  verifyRazorpayHmac,
} from "../src/lib/razorpay-utils.ts";
import { safePaymentErrorMessage } from "../src/lib/payment-errors.ts";
import {
  DEFAULT_STORE_SETTINGS,
  calculateDeliveryCharge,
  normalizeStoredStoreSettings,
  validateStoreSettings,
} from "../src/lib/store-settings.ts";

test("readable identifiers use the expected short, non-personal format", () => {
  const customerIds = Array.from({ length: 100 }, () => generateReadableIdentifier("CUS"));
  const orderIds = Array.from({ length: 100 }, () => generateReadableIdentifier("ORD"));

  assert.ok(customerIds.every(isCustomerIdentifier));
  assert.ok(orderIds.every(isOrderIdentifier));
  assert.equal(new Set(customerIds).size, customerIds.length);
  assert.equal(new Set(orderIds).size, orderIds.length);
});

test("flash-sale date configuration requires a valid absolute ISO timestamp", () => {
  assert.equal(parseFlashSaleEndAt(undefined), null);
  assert.equal(parseFlashSaleEndAt("2026-12-31T23:59:59"), null);
  assert.equal(parseFlashSaleEndAt("2026-02-30T12:00:00Z"), null);
  assert.equal(parseFlashSaleEndAt("2026-12-31T23:59:59+05:30"), Date.parse("2026-12-31T18:29:59Z"));
});

test("countdown uses absolute time and clamps expired sales to zero", () => {
  const target = Date.parse("2026-04-15T02:00:00+02:00");
  const now = Date.parse("2026-04-14T23:59:58Z");

  assert.deepEqual(getFlashSaleCountdown(target, now), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 2,
    expired: false,
  });

  assert.deepEqual(getFlashSaleCountdown(target + (86_400 + 7_384) * 1000, target), {
    days: 1,
    hours: 2,
    minutes: 3,
    seconds: 4,
    expired: false,
  });
  assert.deepEqual(getFlashSaleCountdown(target, target + 1), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: true,
  });
});

test("order reservations are idempotent only for the same user and checkout attempt", () => {
  const orderId = "ORD-K8M4T7";
  const attemptKey = "3b241101-e2bb-4255-8caf-4136c566a962";

  assert.equal(
    ownsOrderIdReservation({ userId: "user-a", attemptKey }, "user-a", orderId, attemptKey),
    true
  );
  assert.equal(
    ownsOrderIdReservation({ userId: "user-b", attemptKey }, "user-a", orderId, attemptKey),
    false
  );
  assert.equal(
    ownsOrderIdReservation({ userId: "user-a", attemptKey: "another-attempt" }, "user-a", orderId, attemptKey),
    false
  );
  assert.equal(
    isSameOrderAttempt(
      { userId: "user-a", checkoutAttemptId: orderId, checkoutAttemptKey: attemptKey },
      "user-a",
      orderId,
      attemptKey
    ),
    true
  );
});

test("Razorpay signatures reject altered payloads, malformed signatures, and wrong secrets", () => {
  const payload = "order_test123|pay_test123";
  const secret = "local-test-secret";
  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  assert.equal(verifyRazorpayHmac(payload, signature, secret), true);
  assert.equal(verifyRazorpayHmac(`${payload}!`, signature, secret), false);
  assert.equal(verifyRazorpayHmac(payload, signature, "different-secret"), false);
  assert.equal(verifyRazorpayHmac(payload, "not-a-signature", secret), false);
});

test("Razorpay amount conversion rounds to paise", () => {
  assert.equal(toPaise(12.345), 1235);
  assert.equal(toPaise(Number.POSITIVE_INFINITY), null);
  assert.equal(toPaise(-1), null);
  assert.equal(calculateDeliveryCharge(998.99, {
    defaultShippingRate: 99,
    freeShippingEnabled: true,
    freeShippingThreshold: 999,
  }), 99);
  assert.equal(calculateDeliveryCharge(999, {
    defaultShippingRate: 99,
    freeShippingEnabled: true,
    freeShippingThreshold: 999,
  }), 0);
});

test("checkout reports missing server credentials without requiring or exposing webhook secrets", () => {
  assert.deepEqual(missingRazorpayCredentials({}), [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
  ]);
  assert.deepEqual(
    missingRazorpayCredentials({
      RAZORPAY_KEY_ID: "rzp_test_public",
      RAZORPAY_KEY_SECRET: "server-secret",
    }),
    []
  );
  assert.match(
    safePaymentErrorMessage(new Error("Missing RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET")),
    /RAZORPAY_KEY_ID/
  );
  assert.doesNotMatch(
    safePaymentErrorMessage(new Error("Checkout failed for person@example.com, phone +91 98765 43210")),
    /person@example\.com|98765/
  );
});

test("Razorpay API errors retain provider diagnostics and map safely to checkout statuses", () => {
  const error = {
    statusCode: 401,
    error: {
      code: "BAD_REQUEST_ERROR",
      description: "Authentication failed",
      reason: "invalid_credentials",
    },
  };

  assert.deepEqual(getRazorpayErrorDetails(error), {
    statusCode: 401,
    code: "BAD_REQUEST_ERROR",
    description: "Authentication failed",
    reason: "invalid_credentials",
  });
  assert.equal(getPaymentInitializationStatus(error), 503);
  assert.equal(getPaymentInitializationStatus({ statusCode: 429 }), 503);
  assert.equal(getPaymentInitializationStatus({ statusCode: 422 }), 502);
  assert.equal(getPaymentInitializationStatus(new Error("Firestore unavailable")), 500);
});

test("store settings support first-time loading and validate values before saving", () => {
  assert.deepEqual(normalizeStoredStoreSettings(DEFAULT_STORE_SETTINGS), DEFAULT_STORE_SETTINGS);
  assert.equal(normalizeStoredStoreSettings({ ...DEFAULT_STORE_SETTINGS, gstPercentage: 101 }), null);

  const settings = {
    websiteName: " Classic Threads ",
    storeEmail: "store@example.com",
    phoneNumber: "+91 98765 43210",
    address: "Main Street",
    freeShippingEnabled: false,
    freeShippingThreshold: 1000,
    defaultShippingRate: 50,
    gstPercentage: 5,
  };
  assert.deepEqual(validateStoreSettings(settings), {
    success: true,
    settings: { ...settings, websiteName: "Classic Threads" },
  });
  assert.deepEqual(validateStoreSettings({ ...settings, storeEmail: "invalid" }), {
    success: false,
    error: "Enter a valid store email address.",
  });
  assert.deepEqual(validateStoreSettings({ ...settings, gstPercentage: 101 }), {
    success: false,
    error: "GST percentage must be a number between 0 and 100.",
  });
});
