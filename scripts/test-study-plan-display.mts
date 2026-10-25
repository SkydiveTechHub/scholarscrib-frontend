import { test } from "node:test";
import assert from "node:assert/strict";
import { groupWindow, planItemHref, timetableMatch, weekOverview } from "../src/lib/study-plan-display";
import { weekdayOf } from "../src/lib/day-keys";
import { groupUnmet } from "../src/lib/study-timetable";

const subject = { slug: "mathematics" };

test("planItemHref sends each activity to the page that completes it", () => {
  assert.equal(planItemHref({ activityType: "LESSON", topicSlug: "sets", subject }), "/classroom/mathematics/sets");
  assert.equal(planItemHref({ activityType: "PRACTICE", topicSlug: "sets", subject }), "/classroom/mathematics/sets/practice");
  assert.equal(planItemHref({ activityType: "REVISION", topicSlug: "sets", subject }), "/classroom/mathematics/sets/quiz");
  assert.equal(planItemHref({ activityType: "REVISION", topicSlug: null, subject }), "/flashcards");
  assert.equal(planItemHref({ activityType: "PAST_QUESTIONS", topicSlug: null, subject }), "/practice/past-questions/mathematics");
  assert.equal(planItemHref({ activityType: "MOCK_EXAM", topicSlug: null, subject }), "/practice/mock-exam");
});

test("groupWindow splits today, recent misses, this week, next week and later", () => {
  const items = [
    { id: "m", date: "2026-09-11", status: "MISSED" },
    { id: "d", date: "2026-09-12", status: "COMPLETED" },
    { id: "a", date: "2026-09-16", status: "PENDING" },
    { id: "t", date: "2026-09-16", status: "COMPLETED" },
    { id: "b", date: "2026-09-18", status: "PENDING" },
    { id: "c", date: "2026-09-20", status: "PENDING" },
    { id: "n", date: "2026-09-22", status: "PENDING" },
    { id: "s", date: "2026-09-27", status: "PENDING" },
    // A window planned on Wednesday 16th runs to Tuesday 29th.
    { id: "l1", date: "2026-09-28", status: "PENDING" },
    { id: "l2", date: "2026-09-29", status: "PENDING" },
  ];
  const g = groupWindow(items, "2026-09-16");
  assert.deepEqual(g.today.map((i) => i.id), ["a", "t"]);
  assert.deepEqual(g.recentMissed.map((i) => i.id), ["m"]);
  assert.deepEqual(g.thisWeek.map((d) => d.date), ["2026-09-18", "2026-09-20"]);
  assert.deepEqual(g.nextWeek.map((d) => d.date), ["2026-09-22", "2026-09-27"]);
  assert.deepEqual(g.later.map((d) => d.date), ["2026-09-28", "2026-09-29"]);
});

test("groupWindow planned on a Monday has nothing later", () => {
  const g = groupWindow([{ date: "2026-09-27", status: "PENDING" }], "2026-09-14");
  assert.deepEqual(g.nextWeek.map((d) => d.date), ["2026-09-27"]);
  assert.deepEqual(g.later, []);
});

// ─── Week overview and timetable marks ──────────────────────────────────────

const sessions = [
  { date: "2026-09-14", status: "COMPLETED", durationMinutes: 30, subject: { code: "MTH", name: "Mathematics" } },
  { date: "2026-09-14", status: "PENDING", durationMinutes: 30, subject: { code: "ENG", name: "English" } },
  { date: "2026-09-14", status: "PENDING", durationMinutes: 15, subject: { code: "MTH", name: "Mathematics" } },
  { date: "2026-09-16", status: "MISSED", durationMinutes: 30, subject: { code: "", name: "Physics" } },
];

test("weekdayOf is 1 for Monday and 7 for Sunday", () => {
  assert.equal(weekdayOf("2026-09-14"), 1);
  assert.equal(weekdayOf("2026-09-19"), 6);
  assert.equal(weekdayOf("2026-09-20"), 7);
});

test("weekOverview covers Monday to Sunday of today's week, whatever day it is", () => {
  const week = weekOverview(sessions, [1, 2, 3, 4, 6], "2026-09-16");
  assert.deepEqual(week.map((d) => d.date), [
    "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20",
  ]);
  assert.deepEqual(week.map((d) => d.name).slice(0, 2), ["Monday", "Tuesday"]);
  assert.deepEqual(week.map((d) => d.isToday), [false, false, true, false, false, false, false]);
});

test("weekOverview counts sessions, minutes, done and missed, and names each subject once", () => {
  const [monday, , wednesday] = weekOverview(sessions, [1, 2, 3, 4, 6], "2026-09-14");
  assert.equal(monday.planned, 3);
  assert.equal(monday.done, 1);
  assert.equal(monday.minutes, 75);
  assert.deepEqual(monday.subjects, ["MTH", "ENG"]);
  assert.equal(wednesday.missed, 1);
  assert.deepEqual(wednesday.subjects, ["Physics"]); // falls back to the name without a code
});

test("weekOverview marks days the student does not study as rest days", () => {
  const week = weekOverview([], [1, 2, 3, 4, 6], "2026-09-14");
  assert.deepEqual(week.filter((d) => d.isRest).map((d) => d.name), ["Friday", "Sunday"]);
  assert.ok(week.every((d) => d.planned === 0));
});

const timetable = {
  version: 1 as const,
  mode: "CUSTOM" as const,
  dayMinutes: [],
  allocations: [
    { day: 1, subjectId: "maths", minutes: null, strength: "PINNED" as const },
    { day: 3, subjectId: "eng", minutes: 60, strength: "PREFERRED" as const },
  ],
};

test("timetableMatch finds a session on the day and subject the student chose", () => {
  assert.equal(timetableMatch({ date: "2026-09-14", subjectId: "maths" }, timetable), "PINNED");
  assert.equal(timetableMatch({ date: "2026-09-16", subjectId: "eng" }, timetable), "PREFERRED");
  // The same weekday the next week still matches; other days and subjects do not.
  assert.equal(timetableMatch({ date: "2026-09-21", subjectId: "maths" }, timetable), "PINNED");
  assert.equal(timetableMatch({ date: "2026-09-15", subjectId: "maths" }, timetable), null);
  assert.equal(timetableMatch({ date: "2026-09-14", subjectId: "eng" }, timetable), null);
});

test("timetableMatch is null for smart and legacy plans", () => {
  assert.equal(timetableMatch({ date: "2026-09-14", subjectId: "maths" }, null), null);
  assert.equal(
    timetableMatch({ date: "2026-09-14", subjectId: "maths" }, { ...timetable, mode: "SMART" }),
    null,
  );
});

test("groupUnmet makes one entry per subject with its days in order", () => {
  const groups = groupUnmet([
    { date: "2026-09-22", subjectId: "art", strength: "PINNED", minutes: 30, reason: "NO_ELIGIBLE_WORK" },
    { date: "2026-09-15", subjectId: "art", strength: "PINNED", minutes: 30, reason: "NO_ELIGIBLE_WORK" },
    { date: "2026-09-15", subjectId: "art", strength: "PINNED", minutes: 30, reason: "NO_ELIGIBLE_WORK" },
    { date: "2026-09-16", subjectId: "art", strength: "PREFERRED", minutes: 30, reason: "NO_ELIGIBLE_WORK" },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].dates, ["2026-09-15", "2026-09-22"]);
  assert.equal(groups[1].strength, "PREFERRED");
});
