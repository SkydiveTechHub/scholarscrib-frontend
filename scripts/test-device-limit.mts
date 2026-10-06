import { test } from "node:test";
import assert from "node:assert/strict";
import { DEVICE_LIMIT, formatLastActive, isDeviceLimited } from "../src/lib/device-limit";

const at = (iso: string) => new Date(iso);

test("the limit is two devices", () => {
  assert.equal(DEVICE_LIMIT, 2);
});

test("only paid tiers are limited", () => {
  assert.equal(isDeviceLimited("FREEMIUM"), false);
  assert.equal(isDeviceLimited("STANDARD"), true);
  assert.equal(isDeviceLimited("PREMIUM"), true);
});

test("last active text", () => {
  const now = at("2026-09-13T10:00:00Z");
  assert.equal(formatLastActive(at("2026-09-13T09:55:00Z"), now), "Active recently");
  assert.equal(formatLastActive(at("2026-09-13T09:20:00Z"), now), "Last active 40 minutes ago");
  assert.equal(formatLastActive(at("2026-09-13T09:00:00Z"), now), "Last active 1 hour ago");
  assert.equal(formatLastActive(at("2026-09-13T05:00:00Z"), now), "Last active 5 hours ago");
  assert.equal(formatLastActive(at("2026-09-12T09:00:00Z"), now), "Last active 1 day ago");
  assert.equal(formatLastActive(at("2026-09-06T10:00:00Z"), now), "Last active 7 days ago");
});
