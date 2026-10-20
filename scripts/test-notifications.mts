import { test } from "node:test";
import assert from "node:assert/strict";
import {
  badgeLabel,
  bellLabel,
  groupByDay,
  kindOf,
  relativeTime,
  targetOf,
} from "../src/lib/notifications";

const now = new Date(2026, 9, 20, 15, 0, 0);
const item = (id: string, createdAt: Date | null) => ({
  id,
  type: "ANNOUNCEMENT",
  title: id,
  body: "",
  createdAt: createdAt ? createdAt.toISOString() : null,
});

test("badge hides at zero and caps at 9+", () => {
  assert.equal(badgeLabel(0), null);
  assert.equal(badgeLabel(-3), null);
  assert.equal(badgeLabel(Number.NaN), null);
  assert.equal(badgeLabel(4), "4");
  assert.equal(badgeLabel(9), "9");
  assert.equal(badgeLabel(10), "9+");
});

test("bell label announces the unread count", () => {
  assert.equal(bellLabel(0), "Notifications");
  assert.equal(bellLabel(3), "Notifications, 3 unread");
});

test("relative time steps up and never goes negative", () => {
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  assert.equal(relativeTime(ago(10_000), now), "now");
  assert.equal(relativeTime(ago(5 * 60_000), now), "5m");
  assert.equal(relativeTime(ago(3 * 3_600_000), now), "3h");
  assert.equal(relativeTime(ago(2 * 86_400_000), now), "2d");
  assert.equal(relativeTime(new Date(now.getTime() + 60_000).toISOString(), now), "now");
  assert.equal(relativeTime(null, now), "");
  assert.equal(relativeTime("not a date", now), "");
});

test("groups by local calendar day in server order", () => {
  const groups = groupByDay(
    [
      item("a", new Date(2026, 9, 20, 9)),
      item("b", new Date(2026, 9, 19, 23)),
      item("c", new Date(2026, 9, 10, 8)),
      item("d", null),
    ],
    now,
  );
  assert.deepEqual(
    groups.map((g) => [g.label, g.items.map((i) => i.id)]),
    [
      ["Today", ["a"]],
      ["Yesterday", ["b"]],
      ["Earlier", ["c", "d"]],
    ],
  );
});

test("empty groups are dropped", () => {
  assert.deepEqual(groupByDay([], now), []);
});

test("only same-origin paths are navigable", () => {
  assert.equal(targetOf({ url: "/practice/mock-exam" }), "/practice/mock-exam");
  assert.equal(targetOf({ url: "https://evil.example" }), null);
  assert.equal(targetOf({ url: "//evil.example" }), null);
  assert.equal(targetOf({ url: null }), null);
});

test("unknown types fall back", () => {
  assert.equal(kindOf("STREAK"), "streak");
  assert.equal(kindOf("MORNING"), "study");
  assert.equal(kindOf("ANNOUNCEMENT"), "announcement");
  assert.equal(kindOf("SOMETHING_NEW"), "other");
});
