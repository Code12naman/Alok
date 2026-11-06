import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDeliveryCharge,
  normalizeShippingSettings,
  validateShippingSettings,
} from "../src/lib/store-settings.ts";

test("applies configurable delivery charges when free shipping is disabled", () => {
  for (const rate of [49, 99, 149]) {
    assert.equal(
      calculateDeliveryCharge(500, {
        defaultShippingRate: rate,
        freeShippingEnabled: false,
        freeShippingThreshold: 1000,
      }),
      rate
    );
    assert.equal(
      calculateDeliveryCharge(1500, {
        defaultShippingRate: rate,
        freeShippingEnabled: false,
        freeShippingThreshold: 1000,
      }),
      rate
    );
  }
});

test("waives delivery only at or above the enabled free-shipping threshold", () => {
  const settings = {
    defaultShippingRate: 99,
    freeShippingEnabled: true,
    freeShippingThreshold: 1000,
  };

  assert.equal(calculateDeliveryCharge(999.99, settings), 99);
  assert.equal(calculateDeliveryCharge(1000, settings), 0);
  assert.equal(calculateDeliveryCharge(1200, settings), 0);
});

test("normalizes missing legacy fields and rejects invalid stored values", () => {
  assert.deepEqual(normalizeShippingSettings({ defaultShippingRate: 49 }), {
    defaultShippingRate: 49,
    freeShippingEnabled: false,
    freeShippingThreshold: 0,
  });
  assert.equal(normalizeShippingSettings({ defaultShippingRate: -1 }), null);
  assert.equal(normalizeShippingSettings({ freeShippingEnabled: "true" }), null);
});

test("validates shipping settings and prevents invalid amounts", () => {
  assert.equal(validateShippingSettings({
    defaultShippingRate: 149,
    freeShippingEnabled: true,
    freeShippingThreshold: 1000,
  }).success, true);

  for (const invalidRate of [-1, Number.NaN, Number.POSITIVE_INFINITY, "99"]) {
    assert.equal(validateShippingSettings({
      defaultShippingRate: invalidRate,
      freeShippingEnabled: false,
      freeShippingThreshold: 1000,
    }).success, false);
  }
});
