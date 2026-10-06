import { test } from "node:test";
import assert from "node:assert/strict";
import { isBillingEnabled, isPushEnabled } from "../src/lib/features";

test("billing is off unless the flag is exactly true", () => {
  assert.equal(isBillingEnabled({}), false);
  assert.equal(isBillingEnabled({ NEXT_PUBLIC_BILLING_ENABLED: "1" }), false);
  assert.equal(isBillingEnabled({ NEXT_PUBLIC_BILLING_ENABLED: " true " }), true);
});

test("push needs both the flag and a public key", () => {
  const full = { NEXT_PUBLIC_PUSH_ENABLED: "true", NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub" };
  assert.equal(isPushEnabled(full), true);
  assert.equal(isPushEnabled({ ...full, NEXT_PUBLIC_PUSH_ENABLED: undefined }), false);
  assert.equal(isPushEnabled({ ...full, NEXT_PUBLIC_VAPID_PUBLIC_KEY: "  " }), false);
});
