import { test } from "node:test";
import assert from "node:assert/strict";
import { describeAccountStatus, isAccountStatus } from "../src/lib/account-status";

// Token issued-at claims are seconds since the epoch, not milliseconds.
const ISSUED = Math.floor(new Date("2026-08-27T10:00:00Z").getTime() / 1000);
const BEFORE = new Date("2026-08-27T09:00:00Z");
const AFTER = new Date("2026-08-27T11:00:00Z");

test("status descriptions distinguish active from suspended", () => {
  assert.equal(describeAccountStatus({ isActive: true }).tone, "success");
  assert.equal(describeAccountStatus({ isActive: false }).tone, "warning");
  assert.notEqual(
    describeAccountStatus({ isActive: true }).label,
    describeAccountStatus({ isActive: false }).label,
  );
});

test("isAccountStatus accepts only the two statuses", () => {
  assert.equal(isAccountStatus("active"), true);
  assert.equal(isAccountStatus("suspended"), true);
  assert.equal(isAccountStatus("ACTIVE"), false);
  assert.equal(isAccountStatus("deleted"), false);
  assert.equal(isAccountStatus(undefined), false);
  assert.equal(isAccountStatus(null), false);
});
