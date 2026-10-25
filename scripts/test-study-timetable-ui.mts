import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AvailabilityEditor } from "../src/components/study-plan/availability-editor";
import { TimetableEditor } from "../src/components/study-plan/timetable-editor";
import { TimetableReview, type ReviewState } from "../src/components/study-plan/timetable-review";
import { formSignature, type PlanFormState } from "../src/lib/study-plan-settings";
import {
  validateDraft,
  type Allocation,
  type PlanHours,
  type PlanPreview,
  type TimetableDraft,
} from "../src/lib/study-timetable";

const SUBJECTS = [
  { id: "maths", name: "Mathematics", code: "MTH" },
  { id: "eng", name: "English", code: "ENG" },
];

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

function renderEditor(draft: TimetableDraft) {
  return renderToStaticMarkup(
    createElement(TimetableEditor, {
      draft,
      hours: HOURS,
      subjects: SUBJECTS,
      issues: validateDraft(draft, HOURS),
      onChange: () => {},
    }),
  );
}

// ─── Timetable editor ───────────────────────────────────────────────────────

test("the editor offers both modes as a radio group with the smart one selectable", () => {
  const html = renderEditor({ mode: "SMART", dayMinutes: {}, allocations: [] });
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /Smart timetable/);
  assert.match(html, /Custom subjects/);
  assert.equal((html.match(/type="radio"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Add a subject to/);
});

test("custom mode shows a card for every weekday with a labelled add button on study days", () => {
  const html = renderEditor(custom(alloc(1, "maths")));
  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
    assert.match(html, new RegExp(`<h3[^>]*>${day}</h3>`));
  }
  assert.match(html, /aria-label="Add a subject to Monday"/);
  assert.doesNotMatch(html, /aria-label="Add a subject to Friday"/);
  assert.match(html, /Rest day/);
});

test("an allocation has labelled controls and a remove button that names what it removes", () => {
  const html = renderEditor(custom(alloc(1, "maths", { minutes: 60, strength: "PINNED" })));
  assert.match(html, /Subject on Monday/);
  assert.match(html, /Time for Mathematics on Monday/);
  assert.match(html, /How firm Mathematics on Monday is/);
  assert.match(html, /aria-label="Remove Mathematics from Monday"/);
  assert.match(html, /aria-label="Move Mathematics from Monday to another day"/);
});

test("pinned is shown in words, not colour alone", () => {
  const html = renderEditor(custom(alloc(1, "maths", { strength: "PINNED" })));
  assert.match(html, /Pinned/);
  assert.match(html, /Pinned \(keep this slot\)/);
  assert.match(html, /Preferred \(can move\)/);
});

test("booked time per day reads in words", () => {
  const html = renderEditor(custom(alloc(1, "maths", { minutes: 60 })));
  assert.match(html, /1 h of 1 h given to subjects/);
});

test("problems are announced on the day they belong to", () => {
  const html = renderEditor(custom(alloc(5, "maths")));
  assert.match(html, /role="alert"[^>]*>Friday is a rest day, so it cannot have a subject\./);
});

test("a plan-wide problem is announced once at the top", () => {
  const html = renderEditor(custom());
  assert.match(html, /role="alert"[^>]*>Put at least one subject on a day/);
});

test("subjects already on a day cannot be picked twice for it", () => {
  const html = renderEditor(custom(alloc(1, "maths"), alloc(1, "eng")));
  assert.match(html, /Every subject in your plan is already on this day\./);
});

test("saved custom subjects are explained while the smart timetable is selected", () => {
  const html = renderEditor({ mode: "SMART", dayMinutes: {}, allocations: [alloc(1, "maths")] });
  assert.match(html, /saved here but not used while the smart timetable is selected/);
});

// ─── Availability editor ────────────────────────────────────────────────────

function renderAvailability(draft: TimetableDraft, studyDays = HOURS.studyDays as number[]) {
  return renderToStaticMarkup(
    createElement(AvailabilityEditor, {
      studyDays,
      weekdayMinutes: 60,
      weekendMinutes: 120,
      draft,
      issues: validateDraft(draft, { ...HOURS, studyDays }),
      onToggleDay: () => {},
      onDefaults: () => {},
      onDraft: () => {},
    }),
  );
}

test("study days are toggles with full day names and a pressed state", () => {
  const html = renderAvailability({ mode: "SMART", dayMinutes: {}, allocations: [] });
  assert.match(html, /aria-label="Monday"[^>]*>|aria-pressed="true"[^>]*aria-label="Monday"/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 5);
  assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 2);
});

test("each study day has its own minutes box and the week total is stated", () => {
  const html = renderAvailability({ mode: "SMART", dayMinutes: { 1: 90 }, allocations: [] });
  assert.match(html, /aria-label="Minutes on Monday"[^>]*value="90"/);
  assert.match(html, /aria-label="Minutes on Tuesday"[^>]*value="60"/);
  assert.match(html, /aria-label="Minutes on Saturday"[^>]*value="120"/);
  assert.doesNotMatch(html, /aria-label="Minutes on Friday"/);
  assert.match(html, /About 6 h 30 min of study each week\./);
});

test("only a day with its own time offers a way back to the usual time", () => {
  const html = renderAvailability({ mode: "SMART", dayMinutes: { 1: 90 }, allocations: [] });
  assert.equal((html.match(/Use the usual time on/g) ?? []).length, 1);
  assert.match(html, /aria-label="Use the usual time on Monday"/);
  assert.doesNotMatch(html, /Use the usual time on Tuesday/);
});

// ─── Review ─────────────────────────────────────────────────────────────────

function renderReview(state: ReviewState) {
  return renderToStaticMarkup(
    createElement(TimetableReview, {
      state,
      subjects: SUBJECTS,
      onRetry: () => {},
      onFix: () => {},
      onUseSmart: () => {},
    }),
  );
}

const READY: PlanPreview = {
  valid: true,
  errors: [],
  warnings: [
    { code: "SUBJECT_NOT_ON_TIMETABLE", message: "English is not on your timetable yet.", day: null, subjectId: "eng" },
  ],
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
    coverage: [
      { subjectId: "maths", daysPerWeek: 3, minutesPerWeek: 90, pinnedDays: 1 },
      { subjectId: "eng", daysPerWeek: 0, minutesPerWeek: 0, pinnedDays: 0 },
    ],
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
    unmet: [
      { date: "2026-09-15", subjectId: "eng", strength: "PINNED", minutes: 30, reason: "NO_ELIGIBLE_WORK" },
      { date: "2026-09-22", subjectId: "eng", strength: "PINNED", minutes: 30, reason: "NO_ELIGIBLE_WORK" },
    ],
    overload: { topicsBehind: 2, suggestedExtraMinutesPerWeek: 60 },
  },
};

test("review shows a loading state while the plan is checked", () => {
  assert.match(renderReview({ status: "loading" }), /Checking your plan/);
});

test("a failed check can be retried and says saving is still possible", () => {
  const html = renderReview({ status: "failed", message: "Network error while checking this plan." });
  assert.match(html, /role="alert"/);
  assert.match(html, /Network error while checking this plan\./);
  assert.match(html, /Try again/);
  assert.match(html, /save and we will check it when it is saved/);
});

test("an older server is explained, and a timetable that would be lost cannot be saved", () => {
  const html = renderReview({ status: "unsupported", timetableInUse: true });
  assert.match(html, /role="alert"/);
  assert.match(html, /This server cannot check custom timetables yet/);
  assert.match(html, /drop them without telling you/);
  assert.match(html, /Use the smart timetable/);
});

test("an older server with a smart plan only loses the preview", () => {
  const html = renderReview({ status: "unsupported", timetableInUse: false });
  assert.match(html, /could not preview your first two weeks/);
  assert.match(html, /smart timetable can still be saved/);
  assert.doesNotMatch(html, /Use the smart timetable/);
  assert.doesNotMatch(html, /drop them/);
});

test("an invalid plan lists every problem and offers a way back", () => {
  const html = renderReview({
    status: "ready",
    preview: {
      valid: false,
      errors: [
        { code: "REST_DAY", message: "Friday is a rest day, so it cannot have a subject.", day: 5, subjectId: "maths" },
        { code: "OVER_CAPACITY", message: "Monday has 90 minutes of subjects but only 60 minutes of study time.", day: 1, subjectId: null },
      ],
      warnings: [],
      summary: null,
      window: null,
    },
  });
  assert.match(html, /This plan cannot be saved yet/);
  assert.match(html, /Friday is a rest day/);
  assert.match(html, /Monday has 90 minutes/);
  assert.match(html, /Go back and fix/);
});

test("a valid plan shows warnings with the subject named, the week, and the first two weeks", () => {
  const html = renderReview({ status: "ready", preview: READY });
  assert.match(html, /Mathematics<\/?[^>]*>|English: /);
  assert.match(html, /English: English is not on your timetable yet\./);
  assert.match(html, /6 h of study time/);
  assert.match(html, /1 h 30 min given to the subjects you chose and 4 h 30 min left/);
  assert.match(html, /Rest days: Friday\./);
  assert.match(html, /English<\/span>: not on your timetable, so it gets leftover time\./);
  assert.match(html, /Mathematics<\/span>: 3 days a week, 1 h 30 min, 1 pinned\./);
  assert.match(html, /Your first two weeks/);
  assert.match(html, /Mathematics — Sets/);
});

test("the preview of the first weeks is labelled as a preview that can change", () => {
  const html = renderReview({ status: "ready", preview: READY });
  assert.match(html, /A preview based on where you are today/);
  assert.match(html, /can change as you learn/);
});

test("unmet sessions are grouped by subject, name the days, and say what to do", () => {
  const html = renderReview({ status: "ready", preview: READY });
  assert.match(html, /Some of your timetable cannot be followed yet/);
  assert.equal((html.match(/English \(pinned\)/g) ?? []).length, 1);
  assert.match(html, /Tue,? 15 Sep/);
  assert.match(html, /Tue,? 22 Sep/);
  assert.match(html, /left empty/);
});

test("overload is guidance, not just a number, and says the plan can still be saved", () => {
  const html = renderReview({ status: "ready", preview: READY });
  assert.match(html, /about 2 topics behind/);
  assert.match(html, /Adding 60 minutes a week, or one more study day, would help/);
  assert.match(html, /You can still save this plan/);
});

test("a smart plan review does not talk about subjects the student chose", () => {
  const html = renderReview({
    status: "ready",
    preview: {
      ...READY,
      warnings: [],
      summary: {
        ...READY.summary!,
        mode: "SMART",
        weeklyAllocatedMinutes: 0,
        coverage: [],
        days: READY.summary!.days.map((day) => ({ ...day, allocatedMinutes: 0, subjects: [] })),
      },
      window: { ...READY.window!, unmet: [], overload: null },
    },
  });
  assert.match(html, /6 h of study time\./);
  assert.doesNotMatch(html, /given to the subjects you chose/);
  assert.match(html, /We choose the subjects\./);
});

// ─── Unsaved changes ────────────────────────────────────────────────────────

const STATE: PlanFormState = {
  classLevel: "SS1",
  term: "FIRST",
  subjectIds: ["maths", "eng"],
  studyDays: [1, 2, 3, 4, 6],
  weekdayMinutes: 60,
  weekendMinutes: 120,
  targetExam: null,
  targetDate: null,
  forceExamMode: false,
  draft: custom(alloc(1, "maths"), alloc(3, "eng")),
};

test("the form signature ignores the order of choices but sees every real change", () => {
  const same: PlanFormState = {
    ...STATE,
    subjectIds: ["eng", "maths"],
    studyDays: [6, 4, 3, 2, 1],
    draft: custom(alloc(3, "eng"), alloc(1, "maths")),
  };
  assert.equal(formSignature(same), formSignature(STATE));

  const changes: Partial<PlanFormState>[] = [
    { term: "SECOND" },
    { subjectIds: ["maths"] },
    { weekdayMinutes: 45 },
    { targetExam: "WAEC" },
    { draft: custom(alloc(1, "maths")) },
    { draft: { ...STATE.draft, mode: "SMART" } },
    { draft: { ...STATE.draft, dayMinutes: { 2: 90 } } },
    { draft: custom(alloc(1, "maths", { strength: "PINNED" }), alloc(3, "eng")) },
  ];
  for (const change of changes) {
    assert.notEqual(formSignature({ ...STATE, ...change }), formSignature(STATE), JSON.stringify(change));
  }
});
