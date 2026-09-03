import assert from "node:assert/strict";
import test from "node:test";

import { requireCheckoutAddress, toMinorUnits } from "./integration.js";

test("converts a two-decimal amount to minor units exactly", () => {
  assert.equal(toMinorUnits("113.00"), 11_300);
  assert.equal(toMinorUnits("0.01"), 1);
});

test("rejects amounts outside the example's currency contract", () => {
  assert.throws(() => toMinorUnits("10.999"));
  assert.throws(() => toMinorUnits("-1.00"));
});

test("normalizes a Canadian checkout address", () => {
  assert.deepEqual(
    requireCheckoutAddress({ country: "CA", state: "on", postalCode: "m5v 2t6" }),
    { country: "CA", state: "ON", postalCode: "M5V 2T6" },
  );
});

