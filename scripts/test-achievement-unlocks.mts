import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNLOCK_WINDOW_MS,
  freshUnlocks,
  progressPercent,
} from "../src/lib/achievement-unlocks";

const NOW = Date.parse("2026-10-16T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const row = (id: string, earnedAt: string | null) => ({
  id,
  title: `Title ${id}`,
  earned: earnedAt !== null,
  earnedAt,
});

test("an achievement earned moments ago is announced", () => {
  const out = freshUnlocks([row("a", ago(10_000))], NOW, new Set());
  assert.deepEqual(out.map((r) => r.id), ["a"]);
});

test("one earned long ago is not announced", () => {
  const out = freshUnlocks([row("a", ago(UNLOCK_WINDOW_MS + 1))], NOW, new Set());
  assert.deepEqual(out, []);
});

test("one already announced is not announced again", () => {
  const out = freshUnlocks([row("a", ago(1_000))], NOW, new Set(["a"]));
  assert.deepEqual(out, []);
});

test("locked rows are never announced", () => {
  assert.deepEqual(freshUnlocks([row("a", null)], NOW, new Set()), []);
});

test("a small clock skew into the future still counts", () => {
  const out = freshUnlocks([row("a", ago(-20_000))], NOW, new Set());
  assert.deepEqual(out.map((r) => r.id), ["a"]);
});

test("an unparseable timestamp is ignored", () => {
  assert.deepEqual(freshUnlocks([row("a", "not a date")], NOW, new Set()), []);
});

test("progress percent rounds and stays within 0-100", () => {
  assert.equal(progressPercent(37, 100), 37);
  assert.equal(progressPercent(1, 3), 33);
  assert.equal(progressPercent(250, 100), 100);
  assert.equal(progressPercent(-4, 10), 0);
  assert.equal(progressPercent(5, 0), 0);
});
