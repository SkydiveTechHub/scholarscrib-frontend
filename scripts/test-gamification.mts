import { test } from "node:test";
import assert from "node:assert/strict";
import {
  XP_WINDOW_MS,
  freshXpAwards,
  levelPercent,
  parseXpProfile,
} from "../src/lib/gamification";

const NOW = Date.parse("2026-10-28T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const profile = {
  totalXp: 120,
  level: 2,
  title: "Starter Scholar",
  xpIntoLevel: 20,
  xpToNext: 130,
  levelSpan: 150,
  isMax: false,
  recent: [{ id: "t1", amount: 20, reason: "Practice set completed", occurredAt: ago(1000) }],
};

test("a valid profile parses", () => {
  const out = parseXpProfile(profile);
  assert.equal(out?.level, 2);
  assert.equal(out?.recent[0].amount, 20);
});

test("a malformed profile is rejected instead of guessed at", () => {
  assert.equal(parseXpProfile({ ...profile, totalXp: "lots" }), null);
  assert.equal(parseXpProfile(null), null);
});

test("level progress is a whole percentage of the level span", () => {
  assert.equal(levelPercent(20, 150), 13);
  assert.equal(levelPercent(0, 100), 0);
});

test("the top level shows a full bar and an empty span never divides by zero", () => {
  assert.equal(levelPercent(0, 0, true), 100);
  assert.equal(levelPercent(5, 0), 0);
});

test("progress never leaves 0-100", () => {
  assert.equal(levelPercent(500, 100), 100);
  assert.equal(levelPercent(-5, 100), 0);
});

test("a recent award is announced", () => {
  const out = freshXpAwards(profile.recent, NOW, new Set());
  assert.deepEqual(out.map((r) => r.id), ["t1"]);
});

test("an old award is not announced", () => {
  const old = [{ ...profile.recent[0], occurredAt: ago(XP_WINDOW_MS + 1) }];
  assert.deepEqual(freshXpAwards(old, NOW, new Set()), []);
});

test("an award already announced is not announced again", () => {
  assert.deepEqual(freshXpAwards(profile.recent, NOW, new Set(["t1"])), []);
});

import { parseDailyQuests, questPercent } from "../src/lib/gamification";

const quests = {
  day: "2026-10-28",
  quests: [
    {
      id: "warm_up",
      type: "warm_up",
      title: "Warm-up",
      description: "Answer 5 questions.",
      target: 5,
      progress: 2,
      complete: false,
      href: "/practice",
    },
  ],
  allComplete: false,
  bonusXp: 30,
  bonusAwarded: false,
};

test("a valid quest set parses", () => {
  assert.equal(parseDailyQuests(quests)?.quests[0].id, "warm_up");
});

test("a quest set with a bad quest is rejected whole", () => {
  const bad = { ...quests, quests: [{ ...quests.quests[0], target: "5" }] };
  assert.equal(parseDailyQuests(bad), null);
});

test("quest links must stay inside the app", () => {
  const external = { ...quests, quests: [{ ...quests.quests[0], href: "https://evil.example" }] };
  assert.equal(parseDailyQuests(external), null);
  const protocolRelative = { ...quests, quests: [{ ...quests.quests[0], href: "//evil.example" }] };
  assert.equal(parseDailyQuests(protocolRelative), null);
});

test("quest percent is bounded and safe for a zero target", () => {
  assert.equal(questPercent(2, 5), 40);
  assert.equal(questPercent(9, 5), 100);
  assert.equal(questPercent(1, 0), 0);
});

import { calendarGrid, parseStreak, returnPrompt } from "../src/lib/gamification";

const streak = {
  timezone: "Africa/Lagos",
  today: "2026-10-28",
  currentStreak: 3,
  longestStreak: 5,
  days: ["2026-10-26", "2026-10-27"],
  studiedToday: false,
  daysSinceLastStudy: 1,
};

test("a valid streak payload parses and a malformed one does not", () => {
  assert.equal(parseStreak(streak)?.currentStreak, 3);
  assert.equal(parseStreak({ ...streak, days: "x" }), null);
});

test("the grid has Monday-first columns of seven and ends at today", () => {
  const grid = calendarGrid(["2026-10-27"], "2026-10-28", 2);
  assert.equal(grid.length, 2);
  assert.ok(grid.every((col) => col.length === 7));
  const cells = grid.flat();
  const today = cells.find((c) => c.date === "2026-10-28");
  assert.equal(today?.isToday, true);
  assert.equal(cells.find((c) => c.date === "2026-10-27")?.studied, true);
  // 2026-10-28 is a Wednesday, so Thursday onward are future cells.
  assert.equal(cells.find((c) => c.date === "2026-10-29")?.future, true);
  assert.equal(grid[1][0].date, "2026-10-26");
});

test("days before the data window are not shown as missed", () => {
  const grid = calendarGrid([], "2026-10-28", 2, "2026-10-20");
  const early = grid.flat().find((c) => c.date === "2026-10-19");
  assert.equal(early?.inRange, false);
});

test("no prompt for someone who has studied today or never started", () => {
  assert.equal(returnPrompt({ ...streak, studiedToday: true, daysSinceLastStudy: 0 }), null);
  assert.equal(returnPrompt({ ...streak, daysSinceLastStudy: null, currentStreak: 0 }), null);
});

test("a live streak gets a gentle nudge for today", () => {
  const p = returnPrompt(streak);
  assert.match(p?.body ?? "", /3-day streak/);
});

test("a longer gap gets a supportive restart with a small first step", () => {
  const p = returnPrompt({ ...streak, currentStreak: 0, daysSinceLastStudy: 4 });
  assert.match(p?.title ?? "", /back on track/i);
  assert.match(p?.body ?? "", /5-minute/);
  assert.doesNotMatch(`${p?.title} ${p?.body}`, /lost|failed|broke|shame/i);
  assert.ok(p?.href.startsWith("/"));
});

import { parseImprovement } from "../src/lib/gamification";

test("an improvement message parses", () => {
  const out = parseImprovement({
    status: "improved",
    message: "You improved from 52% to 68% across comparable practice.",
  });
  assert.match(out?.message ?? "", /52% to 68%/);
});

test("anything but a real improvement shows no message", () => {
  assert.equal(parseImprovement({ status: "steady", message: null })?.message, null);
  assert.equal(parseImprovement({ status: "lower", message: "x" })?.message, null);
  assert.equal(parseImprovement({ status: "insufficient" })?.message, null);
});

test("a malformed improvement payload is dropped", () => {
  assert.equal(parseImprovement({ status: 3 }), null);
});
