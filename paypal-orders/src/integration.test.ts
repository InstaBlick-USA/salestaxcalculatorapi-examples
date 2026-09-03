import assert from "node:assert/strict";
import test from "node:test";

import { requireCheckoutAddress } from "./integration.js";

test("normalizes a Canadian checkout address", () => {
  assert.deepEqual(
    requireCheckoutAddress({ country: "CA", state: "on", postalCode: "m5v 2t6" }),
    { country: "CA", state: "ON", postalCode: "M5V 2T6" },
  );
});

test("rejects an unsupported address shape", () => {
  assert.throws(() => requireCheckoutAddress({ country: "US", state: "NY", postalCode: "10001" }));
});

