import { test } from "node:test";
import assert from "node:assert/strict";
import { intervalLabel } from "../src/lib/spaced-repetition";

const at = new Date("2026-08-01T09:00:00Z");

test("intervalLabel is human-readable", () => {
  assert.equal(intervalLabel(0), "now");
  assert.ok(intervalLabel(1).includes("1d"));
  assert.ok(intervalLabel(0.5).includes("12h"));
});
