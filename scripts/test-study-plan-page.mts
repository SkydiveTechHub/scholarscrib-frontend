import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanItemRow } from "../src/components/study-plan/plan-item-row";
import { PlanSchedule } from "../src/components/study-plan/plan-schedule";
import { TimetableSummary } from "../src/components/study-plan/timetable-summary";
import { UnmetNotice } from "../src/components/study-plan/unmet-notice";
import { WeekOverview } from "../src/components/study-plan/week-overview";
import type { StudyPlanData, StudyPlanItemData } from "../src/lib/study-plan";

const SUBJECTS = [
  { id: "maths", name: "Mathematics", code: "MTH", slug: "mathematics" },
  { id: "eng", name: "English", code: "ENG", slug: "english" },
];

const item = (over: Partial<StudyPlanItemData> = {}): StudyPlanItemData => ({
  id: "i1",
  date: "2026-09-14",
  subjectId: "maths",
  topicId: "t1",
  topicSlug: "sets",
  topicTitle: "Sets",
  activityType: "LESSON",
  durationMinutes: 30,
  status: "PENDING",
  notes: "Your class is on this topic now",
  carriedFrom: null,
  completionSource: null,
  subject: { name: "Mathematics", code: "MTH", slug: "mathematics" },
  ...over,
});

const PLAN: StudyPlanData = {
  id: "p1",
  scope: { classLevel: "SS1", term: "FIRST" },
  followsCalendar: true,
  mode: "TERM",
  subjectIds: ["maths", "eng"],
  studyDays: [1, 2, 3, 4, 6],
  weekdayMinutes: 60,
  weekendMinutes: 120,
  targetExam: null,
  targetDate: null,
  forceExamMode: false,
  plannedThrough: "2026-09-27",
  runwayStart: null,
  outline: [
    { weekStart: "2026-09-28", label: null, topics: [{ subjectId: "maths", title: "Algebra" }] },
  ],
  overload: null,
  timetable: {
    version: 1,
    mode: "CUSTOM",
    dayMinutes: [{ day: 6, minutes: 90 }],
    allocations: [
      { day: 1, subjectId: "maths", minutes: 60, strength: "PINNED" },
      { day: 3, subjectId: "eng", minutes: null, strength: "PREFERRED" },
    ],
  },
  unmet: [],
  items: [
    item(),
    item({ id: "i2", subjectId: "eng", subject: { name: "English", code: "ENG", slug: "english" }, activityType: "PRACTICE", status: "COMPLETED" }),
    item({ id: "i3", date: "2026-09-15", carriedFrom: "2026-09-12", activityType: "REVISION" }),
  ],
  positions: {},
  calendarPositions: {},
  positionOptions: {},
};

const noop = async () => {};

// ─── Sessions ───────────────────────────────────────────────────────────────

test("a session shows subject, topic, activity, duration and why it was planned", () => {
  const html = renderToStaticMarkup(createElement(PlanItemRow, { item: item(), onStatus: noop }));
  assert.match(html, /Lesson/);
  assert.match(html, /MTH — Sets/);
  assert.match(html, /30 min/);
  assert.match(html, /Your class is on this topic now/);
});

test("a session moved from another day says so", () => {
  const html = renderToStaticMarkup(
    createElement(PlanItemRow, { item: item({ carriedFrom: "2026-09-12" }), onStatus: noop }),
  );
  assert.match(html, /Moved from Saturday/);
});

test("a session on the student's timetable is marked, and a pinned one says pinned in words", () => {
  const plain = renderToStaticMarkup(createElement(PlanItemRow, { item: item(), onStatus: noop }));
  assert.doesNotMatch(plain, /timetable/);
  const preferred = renderToStaticMarkup(
    createElement(PlanItemRow, { item: item(), onStatus: noop, fromTimetable: "PREFERRED" }),
  );
  assert.match(preferred, /On your timetable/);
  const pinned = renderToStaticMarkup(
    createElement(PlanItemRow, { item: item(), onStatus: noop, fromTimetable: "PINNED" }),
  );
  assert.match(pinned, /Pinned on your timetable/);
});

test("the schedule marks only the sessions that match the timetable", () => {
  const html = renderToStaticMarkup(
    createElement(PlanSchedule, { plan: PLAN, today: "2026-09-14", onStatus: noop }),
  );
  // Monday maths matches the pinned allocation; Monday english and Tuesday maths do not.
  assert.equal((html.match(/Pinned on your timetable/g) ?? []).length, 1);
  assert.equal((html.match(/On your timetable/g) ?? []).length, 0);
});

test("a smart plan marks nothing as being on a timetable", () => {
  const html = renderToStaticMarkup(
    createElement(PlanSchedule, {
      plan: { ...PLAN, timetable: null },
      today: "2026-09-14",
      onStatus: noop,
    }),
  );
  assert.doesNotMatch(html, /on your timetable/i);
});

test("the long-range outline is called a projection that ignores the timetable", () => {
  const html = renderToStaticMarkup(
    createElement(PlanSchedule, { plan: PLAN, today: "2026-09-14", onStatus: noop }),
  );
  assert.match(html, /Rest of the plan \(a rough projection\)/);
  assert.match(html, /not a day-by-day schedule/);
  assert.match(html, /does not follow your timetable/);
  assert.match(html, /planned two weeks at a time/);
});

// ─── Week at a glance ───────────────────────────────────────────────────────

test("the week at a glance shows seven days, today, rest days and progress", () => {
  const html = renderToStaticMarkup(createElement(WeekOverview, { plan: PLAN, today: "2026-09-14" }));
  assert.match(html, /This week at a glance/);
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
    assert.match(html, new RegExp(`>${day}<`));
  }
  assert.equal((html.match(/<li /g) ?? []).length, 7);
  assert.match(html, /aria-current="date"/);
  assert.match(html, /Today/);
  assert.equal((html.match(/Rest day/g) ?? []).length, 2); // Friday and Sunday
  assert.match(html, /2 sessions · 1 h/);
  assert.match(html, /1 of 2 done/);
});

// ─── The student's timetable, apart from the sessions ───────────────────────

test("the timetable card lists the chosen subjects per day and marks pins in words", () => {
  const html = renderToStaticMarkup(
    createElement(TimetableSummary, { plan: PLAN, subjects: SUBJECTS, onEdit: () => {} }),
  );
  assert.match(html, /Your timetable/);
  assert.match(html, /Custom subjects/);
  assert.match(html, /MTH · 1 h/);
  assert.match(html, /\(pinned\)/);
  assert.match(html, /ENG · 30 min/);
  assert.match(html, /Open: we choose\./);
  assert.match(html, /Rest day/);
  assert.match(html, /1 h 30 min/); // Saturday's own time
  assert.match(html, /topics and activities inside them are picked for you/);
  assert.match(html, /Edit subjects/);
  assert.match(html, /Change study time/);
});

test("a smart plan's card says the subjects are chosen for the student", () => {
  const html = renderToStaticMarkup(
    createElement(TimetableSummary, {
      plan: { ...PLAN, timetable: null },
      subjects: SUBJECTS,
      onEdit: () => {},
    }),
  );
  assert.match(html, />Smart</);
  assert.match(html, /We choose the subjects and topics each day\./);
  assert.match(html, /Choose subjects by day/);
  assert.doesNotMatch(html, /Open: we choose/);
});

// ─── Unmet sessions ─────────────────────────────────────────────────────────

const UNMET = [
  { date: "2026-09-15", subjectId: "eng", strength: "PINNED" as const, minutes: 30, reason: "NO_ELIGIBLE_WORK" },
  { date: "2026-09-22", subjectId: "eng", strength: "PINNED" as const, minutes: 30, reason: "NO_ELIGIBLE_WORK" },
  { date: "2026-09-10", subjectId: "maths", strength: "PREFERRED" as const, minutes: 30, reason: "NO_ELIGIBLE_WORK" },
];

test("unmet sessions are explained with the days and what the student can do", () => {
  const html = renderToStaticMarkup(
    createElement(UnmetNotice, { unmet: UNMET, subjects: SUBJECTS, today: "2026-09-14", onEdit: () => {} }),
  );
  assert.match(html, /Some of your timetable could not be followed/);
  assert.match(html, /English \(pinned\)/);
  assert.match(html, /Tue,? 15 Sep/);
  assert.match(html, /Tue,? 22 Sep/);
  assert.match(html, /left empty/);
  assert.match(html, /Edit subjects/);
  assert.match(html, /Add study time/);
});

test("past unmet sessions are history, not a notice", () => {
  const html = renderToStaticMarkup(
    createElement(UnmetNotice, {
      unmet: [UNMET[2]],
      subjects: SUBJECTS,
      today: "2026-09-14",
      onEdit: () => {},
    }),
  );
  assert.equal(html, "");
});

test("no unmet sessions means no notice", () => {
  const html = renderToStaticMarkup(
    createElement(UnmetNotice, { unmet: [], subjects: SUBJECTS, today: "2026-09-14", onEdit: () => {} }),
  );
  assert.equal(html, "");
});
