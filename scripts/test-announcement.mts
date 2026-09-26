import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIRM_TYPED_THRESHOLD, needsTypedConfirm } from "../src/lib/announcement";

const valid = { title: "New mock exam", body: "JAMB mock 3 is live.", url: "/practice", audience: {}, expiresInDays: 7 };

test("typed confirmation from 500 devices", () => {
  assert.equal(CONFIRM_TYPED_THRESHOLD, 500);
  assert.equal(needsTypedConfirm(499), false);
  assert.equal(needsTypedConfirm(500), true);
});
