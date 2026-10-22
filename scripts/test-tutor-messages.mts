import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeError,
  exhaustedMessage,
  resetPhrase,
} from "../src/lib/tutor/messages";
import { trapTarget } from "../src/lib/tutor/focus-trap";

const NOW = new Date(2026, 9, 20, 14, 0); // 20 Oct 2026, 2pm local

test("a reset later today names the time", () => {
  const at = new Date(2026, 9, 20, 18, 30).toISOString();
  assert.match(resetPhrase(at, NOW), /^at .*(6|18).*30/);
});

test("a midnight reset reads as tomorrow, never 00:00", () => {
  const at = new Date(2026, 9, 21, 0, 0).toISOString();
  assert.equal(resetPhrase(at, NOW), "tomorrow");
});

test("a mid-morning reset tomorrow names day and time", () => {
  const at = new Date(2026, 9, 21, 6, 0).toISOString();
  assert.match(resetPhrase(at, NOW), /^tomorrow at /);
});

test("missing or invalid reset falls back to tomorrow", () => {
  assert.equal(resetPhrase(null, NOW), "tomorrow");
  assert.equal(resetPhrase("garbage", NOW), "tomorrow");
});

test("an exhausted quota with no error still explains itself", () => {
  const at = new Date(2026, 9, 21, 0, 0).toISOString();
  const msg = exhaustedMessage(at, NOW);
  assert.match(msg, /used today's questions/i);
  assert.match(msg, /tomorrow/);
});

test("rate limit is not retryable and mentions the reset", () => {
  const view = describeError(
    { code: "RATE_LIMITED", message: "x", resetsAt: new Date(2026, 9, 21, 0, 0).toISOString() },
    NOW,
  );
  assert.equal(view.retry, false);
  assert.equal(view.upgrade, false);
  assert.match(view.message, /tomorrow/);
});

test("tier required offers an upgrade, not a retry", () => {
  const view = describeError({ code: "TIER_REQUIRED", message: "x" }, NOW);
  assert.equal(view.retry, false);
  assert.equal(view.upgrade, true);
});

test("a pending action is not a retry, it asks for the card", () => {
  const view = describeError({ code: "ACTION_PENDING", message: "x" }, NOW);
  assert.equal(view.retry, false);
  assert.match(view.message, /approve or dismiss/i);
});

test("a failed confirmation stays on the card instead of resending", () => {
  const view = describeError(
    { code: "ACTION_RESUME", message: "Couldn't confirm that change. You can try again." },
    NOW,
  );
  assert.equal(view.retry, false);
  assert.match(view.message, /try again/i);
});

test("context not found is not retryable", () => {
  const view = describeError({ code: "CONTEXT_NOT_FOUND", message: "x" }, NOW);
  assert.equal(view.retry, false);
  assert.equal(view.upgrade, false);
});

test("unavailable keeps the server message and is retryable", () => {
  const view = describeError({ code: "UNAVAILABLE", message: "Try later" }, NOW);
  assert.equal(view.retry, true);
  assert.equal(view.message, "Try later");
});

test("unknown codes are retryable", () => {
  assert.equal(describeError({ code: "WHAT", message: "m" }, NOW).retry, true);
});

// ── focus trap ──
const a = { id: "a" };
const b = { id: "b" };
const c = { id: "c" };
const box = { id: "box" };

test("Tab from the last element wraps to the first, Shift+Tab from the first to the last", () => {
  assert.equal(trapTarget([a, b, c], c, box, false), a);
  assert.equal(trapTarget([a, b, c], a, box, true), c);
});

test("Tab inside the list is left to the browser", () => {
  assert.equal(trapTarget([a, b, c], b, box, false), null);
  assert.equal(trapTarget([a, b, c], b, box, true), null);
});

test("focus on the dialog container itself enters the list at the right end", () => {
  assert.equal(trapTarget([a, b, c], box, box, false), a);
  assert.equal(trapTarget([a, b, c], box, box, true), c);
});

test("focus that escaped the dialog is pulled back in", () => {
  const outside = { id: "outside" };
  assert.equal(trapTarget([a, b, c], outside, box, false), a);
});

test("an empty dialog does not trap", () => {
  assert.equal(trapTarget([], box, box, false), null);
});
