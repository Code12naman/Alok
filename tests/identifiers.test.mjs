import assert from "node:assert/strict";
import test from "node:test";
import { generateReadableIdentifier, isCustomerIdentifier, isOrderIdentifier } from "../src/lib/identifiers.ts";
import { getFlashSaleCountdown, parseFlashSaleEndAt } from "../src/lib/flash-sale.ts";
import { isSameOrderAttempt, ownsOrderIdReservation } from "../src/lib/order-id-reservation.ts";

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
