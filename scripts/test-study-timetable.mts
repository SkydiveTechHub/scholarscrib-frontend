import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addAllocation,
  allocationsOn,
  dayCapacity,
  dayMinutes,
  draftFromTimetable,
  minutesLabel,
  nextSubjectFor,
  parsePreview,
  parseTimetable,
  parseUnmet,
  removeAllocation,
  setDayMinutes,
  timetableForSave,
  timetableSignature,
  unmetExplanation,
  updateAllocation,
  validateDraft,
  type Allocation,
  type PlanHours,
  type TimetableDraft,
} from "../src/lib/study-timetable";

const HOURS: PlanHours = {
  studyDays: [1, 2, 3, 4, 6],
  weekdayMinutes: 60,
  weekendMinutes: 120,
  subjectIds: ["maths", "eng"],
};

const alloc = (day: number, subjectId: string, extra: Partial<Allocation> = {}): Allocation => ({
  day,
  subjectId,
  minutes: null,
  strength: "PREFERRED",
  ...extra,
});

const custom = (...allocations: Allocation[]): TimetableDraft => ({
  mode: "CUSTOM",
  dayMinutes: {},
  allocations,
});

const codes = (draft: TimetableDraft, hours: PlanHours = HOURS) =>
  validateDraft(draft, hours).map((row) => row.code);

// ─── Hours ──────────────────────────────────────────────────────────────────

test("a day uses its override, otherwise the weekday or weekend default", () => {
  const draft = { dayMinutes: { 2: 90 } };
  assert.equal(dayMinutes(1, draft, HOURS), 60);
  assert.equal(dayMinutes(2, draft, HOURS), 90);
  assert.equal(dayMinutes(6, draft, HOURS), 120);
});

test("capacity counts whole sessions only", () => {
  assert.equal(dayCapacity(1, { dayMinutes: { 1: 45 } }, HOURS), 30);
  assert.equal(dayCapacity(1, { dayMinutes: {} }, HOURS), 60);
  assert.equal(dayCapacity(1, { dayMinutes: { 1: 29 } }, HOURS), 0);
});

test("setting a day to the default clears the override", () => {
  const withOverride = setDayMinutes({ mode: "SMART", dayMinutes: {}, allocations: [] }, 1, 90, HOURS);
  assert.deepEqual(withOverride.dayMinutes, { 1: 90 });
  const cleared = setDayMinutes(withOverride, 1, 60, HOURS);
  assert.deepEqual(cleared.dayMinutes, {});
});

// ─── Allocations ────────────────────────────────────────────────────────────

test("add, update and remove leave the original untouched", () => {
  const start = custom(alloc(1, "maths"));
  const added = addAllocation(start, alloc(2, "eng"));
  assert.equal(start.allocations.length, 1);
  assert.equal(added.allocations.length, 2);
  const pinned = updateAllocation(added, 1, { strength: "PINNED" });
  assert.equal(added.allocations[1].strength, "PREFERRED");
  assert.equal(pinned.allocations[1].strength, "PINNED");
  assert.deepEqual(removeAllocation(pinned, 0).allocations.map((r) => r.subjectId), ["eng"]);
});

test("allocationsOn keeps each row's index in the full list", () => {
  const draft = custom(alloc(1, "maths"), alloc(2, "eng"), alloc(1, "eng"));
  assert.deepEqual(allocationsOn(draft, 1).map((r) => r.index), [0, 2]);
});

test("nextSubjectFor offers a subject not already on the day", () => {
  const draft = custom(alloc(1, "maths"));
  assert.equal(nextSubjectFor(draft, 1, HOURS.subjectIds), "eng");
  assert.equal(nextSubjectFor(addAllocation(draft, alloc(1, "eng")), 1, HOURS.subjectIds), null);
  assert.equal(nextSubjectFor(draft, 2, HOURS.subjectIds), "maths");
});

// ─── Validation mirrors the backend ─────────────────────────────────────────

test("a smart draft with nothing set is valid", () => {
  assert.deepEqual(codes({ mode: "SMART", dayMinutes: {}, allocations: [] }), []);
});

test("a smart draft ignores stray allocations, as it never sends them", () => {
  assert.deepEqual(codes({ mode: "SMART", dayMinutes: {}, allocations: [alloc(5, "maths")] }), []);
});

test("custom mode needs at least one subject", () => {
  assert.deepEqual(codes(custom()), ["NO_ALLOCATIONS"]);
});

test("one subject on several days, several subjects on one day", () => {
  const draft = custom(alloc(1, "maths"), alloc(3, "maths"), alloc(1, "eng", { minutes: 30, strength: "PINNED" }));
  assert.deepEqual(codes(draft), []);
});

test("a rest day cannot take a subject or study time", () => {
  assert.deepEqual(codes(custom(alloc(5, "maths"))), ["REST_DAY"]);
  assert.deepEqual(codes({ mode: "SMART", dayMinutes: { 7: 60 }, allocations: [] }), ["REST_DAY"]);
});

test("a subject outside the plan is flagged against its day and subject", () => {
  const [issue] = validateDraft(custom(alloc(1, "chem")), HOURS);
  assert.equal(issue.code, "SUBJECT_NOT_IN_PLAN");
  assert.equal(issue.day, 1);
  assert.equal(issue.subjectId, "chem");
});

test("the same subject twice on a day is flagged", () => {
  assert.deepEqual(codes(custom(alloc(1, "maths"), alloc(1, "maths"))), ["DUPLICATE_ALLOCATION"]);
});

test("minutes must be whole sessions", () => {
  assert.deepEqual(codes(custom(alloc(1, "maths", { minutes: 45 }))), ["BAD_STEP"]);
  assert.deepEqual(codes(custom(alloc(1, "maths", { minutes: 60 }))), []);
});

test("a day cannot hold more than its sessions", () => {
  assert.deepEqual(codes(custom(alloc(1, "maths"), alloc(1, "eng"))), []);
  assert.deepEqual(codes(custom(alloc(1, "maths", { minutes: 60 }), alloc(1, "eng"))), ["OVER_CAPACITY"]);
});

test("a day override changes the capacity of that day only", () => {
  const longer = { ...custom(alloc(1, "maths", { minutes: 90 })), dayMinutes: { 1: 90 } };
  assert.deepEqual(codes(longer), []);
  const otherDay = { ...custom(alloc(2, "maths", { minutes: 90 })), dayMinutes: { 1: 90 } };
  assert.deepEqual(codes(otherDay), ["OVER_CAPACITY"]);
});

test("a short remainder does not count towards capacity", () => {
  const two = custom(alloc(1, "maths"), alloc(1, "eng"));
  assert.deepEqual(codes(two, { ...HOURS, weekdayMinutes: 45 }), ["OVER_CAPACITY"]);
});

test("a day override under one session is flagged", () => {
  assert.deepEqual(codes({ mode: "SMART", dayMinutes: { 1: 20 }, allocations: [] }), ["TOO_SHORT"]);
});

test("removing a study day leaves its subjects flagged, never silently dropped", () => {
  const draft = custom(alloc(3, "maths"));
  const without = { ...HOURS, studyDays: [1, 2, 4, 6] };
  assert.deepEqual(codes(draft, without), ["REST_DAY"]);
  assert.equal(draft.allocations.length, 1);
});

// ─── Draft ↔ API ────────────────────────────────────────────────────────────

test("a smart draft with no overrides saves as null", () => {
  assert.equal(timetableForSave({ mode: "SMART", dayMinutes: {}, allocations: [] }), null);
});

test("a smart draft with overrides keeps them and sends no allocations", () => {
  const saved = timetableForSave({ mode: "SMART", dayMinutes: { 3: 90 }, allocations: [alloc(1, "maths")] });
  assert.deepEqual(saved, { version: 1, mode: "SMART", dayMinutes: [{ day: 3, minutes: 90 }], allocations: [] });
});

test("a custom draft saves sorted by day then subject", () => {
  const saved = timetableForSave(custom(alloc(3, "eng"), alloc(1, "maths"), alloc(1, "eng")));
  assert.deepEqual(saved?.allocations.map((r) => `${r.day}:${r.subjectId}`), ["1:eng", "1:maths", "3:eng"]);
});

test("a saved timetable loads back into the same draft", () => {
  const draft: TimetableDraft = {
    mode: "CUSTOM",
    dayMinutes: { 1: 90 },
    allocations: [alloc(1, "maths", { minutes: 60, strength: "PINNED" }), alloc(3, "eng")],
  };
  const again = draftFromTimetable(timetableForSave(draft));
  assert.equal(timetableSignature(again), timetableSignature(draft));
  assert.deepEqual(again.dayMinutes, { 1: 90 });
});

test("a legacy plan loads as a smart draft", () => {
  assert.deepEqual(draftFromTimetable(null), { mode: "SMART", dayMinutes: {}, allocations: [] });
});

test("equal intent has an equal signature whatever the order it was entered in", () => {
  const a = custom(alloc(1, "maths"), alloc(3, "eng"));
  const b = custom(alloc(3, "eng"), alloc(1, "maths"));
  assert.equal(timetableSignature(a), timetableSignature(b));
  assert.notEqual(timetableSignature(a), timetableSignature(custom(alloc(1, "maths"))));
});

test("switching to smart and back keeps the custom subjects in the draft", () => {
  const draft = custom(alloc(1, "maths"));
  const smart = { ...draft, mode: "SMART" as const };
  assert.equal(timetableForSave(smart), null);
  const back = { ...smart, mode: "CUSTOM" as const };
  assert.equal(timetableForSave(back)?.allocations.length, 1);
});

// ─── Wire parsing ───────────────────────────────────────────────────────────

test("parseTimetable returns null for a smart or missing timetable", () => {
  assert.equal(parseTimetable(null), null);
  assert.equal(parseTimetable(undefined), null);
  assert.equal(parseTimetable("nope"), null);
});

test("parseTimetable reads a stored timetable and drops malformed rows", () => {
  const parsed = parseTimetable({
    version: 1,
    mode: "CUSTOM",
    dayMinutes: [{ day: 1, minutes: 90 }, { day: "x", minutes: 10 }],
    allocations: [
      { day: 1, subjectId: "maths", minutes: 60, strength: "PINNED" },
      { day: 9, subjectId: "maths", minutes: null, strength: "PREFERRED" },
      { day: 2, subjectId: 5 },
      { day: 3, subjectId: "eng", minutes: null, strength: "WHATEVER" },
    ],
  });
  assert.equal(parsed?.mode, "CUSTOM");
  assert.deepEqual(parsed?.dayMinutes, [{ day: 1, minutes: 90 }]);
  assert.deepEqual(parsed?.allocations.map((r) => [r.day, r.strength]), [[1, "PINNED"], [3, "PREFERRED"]]);
});

test("parseUnmet keeps the date, the strength and a default reason", () => {
  const rows = parseUnmet([
    { date: "2026-09-14T00:00:00Z", subjectId: "art", strength: "PINNED", minutes: 30, reason: "NO_ELIGIBLE_WORK" },
    { subjectId: "no-date" },
  ]);
  assert.deepEqual(rows, [
    { date: "2026-09-14", subjectId: "art", strength: "PINNED", minutes: 30, reason: "NO_ELIGIBLE_WORK" },
  ]);
  assert.deepEqual(parseUnmet(undefined), []);
});

test("parsePreview reads a valid response", () => {
  const preview = parsePreview({
    valid: true,
    errors: [],
    warnings: [{ code: "DAY_FULLY_BOOKED", message: "Monday is fully booked.", day: 1, subjectId: null }],
    summary: {
      mode: "CUSTOM",
      weeklyAvailableMinutes: 360,
      weeklyAllocatedMinutes: 90,
      days: [
        {
          day: 1,
          name: "Monday",
          availableMinutes: 60,
          allocatedMinutes: 30,
          unallocatedMinutes: 30,
          subjects: [{ subjectId: "maths", minutes: 30, strength: "PINNED" }],
        },
      ],
      restDays: [{ day: 5, name: "Friday" }],
      coverage: [{ subjectId: "maths", daysPerWeek: 1, minutesPerWeek: 30, pinnedDays: 1 }],
    },
    window: {
      plannedThrough: "2026-09-27",
      items: [
        {
          date: "2026-09-14",
          subjectId: "maths",
          subjectName: "Mathematics",
          topicId: "m1",
          topicTitle: "Sets",
          activityType: "LESSON",
          durationMinutes: 30,
          notes: null,
          carriedFrom: null,
        },
      ],
      unmet: [],
      overload: { topicsBehind: 2, suggestedExtraMinutesPerWeek: 60 },
    },
  });
  assert.equal(preview.valid, true);
  assert.equal(preview.warnings[0].day, 1);
  assert.equal(preview.summary?.days[0].subjects[0].strength, "PINNED");
  assert.equal(preview.window?.items[0].topicTitle, "Sets");
  assert.deepEqual(preview.window?.overload, { topicsBehind: 2, suggestedExtraMinutesPerWeek: 60 });
});

test("parsePreview treats an invalid or unreadable response as not valid", () => {
  const bad = parsePreview({
    valid: false,
    errors: [{ code: "REST_DAY", message: "Friday is a rest day.", day: 5, subjectId: "maths" }],
    warnings: [],
    summary: null,
    window: null,
  });
  assert.equal(bad.valid, false);
  assert.equal(bad.errors[0].subjectId, "maths");
  assert.equal(bad.summary, null);
  assert.equal(parsePreview(null).valid, false);
  assert.equal(parsePreview("garbage").window, null);
});

// ─── Wording ────────────────────────────────────────────────────────────────

test("minutesLabel reads naturally", () => {
  assert.equal(minutesLabel(30), "30 min");
  assert.equal(minutesLabel(60), "1 h");
  assert.equal(minutesLabel(90), "1 h 30 min");
});

test("unmet explanations tell a pinned subject from a preferred one", () => {
  assert.match(unmetExplanation("NO_ELIGIBLE_WORK", "PINNED"), /left empty/);
  assert.match(unmetExplanation("NO_ELIGIBLE_WORK", "PREFERRED"), /went to other work/);
  assert.match(unmetExplanation("NO_CAPACITY", "PREFERRED"), /free session/);
});
