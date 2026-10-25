// The student's study timetable: what they ask for, not the tasks generated from it.
//
// Pure helpers only (no React, no network). The backend is the authority on
// whether a timetable is valid; the checks here mirror its rules so the editor
// can point at a problem straight away. A timetable that passes here can still
// be rejected, and the review step always asks the backend.

export type Strength = "PREFERRED" | "PINNED";
export type TimetableMode = "SMART" | "CUSTOM";

export const SESSION_MINUTES = 30;
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export const DAY_SHORT: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

/** One subject on one weekday. `minutes: null` means a single planner session. */
export type Allocation = {
  day: number;
  subjectId: string;
  minutes: number | null;
  strength: Strength;
};

/** The timetable as the API stores and accepts it. */
export type TimetableData = {
  version: 1;
  mode: TimetableMode;
  dayMinutes: { day: number; minutes: number }[];
  allocations: Allocation[];
};

/** The editable form of a timetable. Overrides are keyed by weekday. */
export type TimetableDraft = {
  mode: TimetableMode;
  dayMinutes: Record<number, number>;
  allocations: Allocation[];
};

export type TimetableIssue = {
  code: string;
  message: string;
  day: number | null;
  subjectId: string | null;
};

/** The plan settings a timetable has to fit inside. */
export type PlanHours = {
  studyDays: readonly number[];
  weekdayMinutes: number;
  weekendMinutes: number;
  subjectIds: readonly string[];
};

export const EMPTY_DRAFT: TimetableDraft = { mode: "SMART", dayMinutes: {}, allocations: [] };

// ─── Hours ──────────────────────────────────────────────────────────────────

export function defaultMinutes(day: number, hours: Pick<PlanHours, "weekdayMinutes" | "weekendMinutes">): number {
  return day >= 6 ? hours.weekendMinutes : hours.weekdayMinutes;
}

/** Minutes a study day has: its own override, else the weekday or weekend default. */
export function dayMinutes(
  day: number,
  draft: Pick<TimetableDraft, "dayMinutes">,
  hours: Pick<PlanHours, "weekdayMinutes" | "weekendMinutes">,
): number {
  return draft.dayMinutes[day] ?? defaultMinutes(day, hours);
}

/** Minutes of whole 30-minute sessions; a shorter remainder only carries revision. */
export function dayCapacity(
  day: number,
  draft: Pick<TimetableDraft, "dayMinutes">,
  hours: Pick<PlanHours, "weekdayMinutes" | "weekendMinutes">,
): number {
  return Math.floor(dayMinutes(day, draft, hours) / SESSION_MINUTES) * SESSION_MINUTES;
}

/** What an allocation reserves: its minutes, or one session when unset. */
export function reservedMinutes(allocation: Pick<Allocation, "minutes">): number {
  return allocation.minutes ?? SESSION_MINUTES;
}

/**
 * Sets one study day's minutes. Matching the default clears the override, so
 * "same as everyday" is never stored as a custom time.
 */
export function setDayMinutes(
  draft: TimetableDraft,
  day: number,
  minutes: number,
  hours: Pick<PlanHours, "weekdayMinutes" | "weekendMinutes">,
): TimetableDraft {
  const next = { ...draft.dayMinutes };
  if (minutes === defaultMinutes(day, hours)) delete next[day];
  else next[day] = minutes;
  return { ...draft, dayMinutes: next };
}

// ─── Allocations ────────────────────────────────────────────────────────────

export function allocationsOn(draft: TimetableDraft, day: number): { allocation: Allocation; index: number }[] {
  return draft.allocations
    .map((allocation, index) => ({ allocation, index }))
    .filter((row) => row.allocation.day === day);
}

/** A subject not yet on `day`, or null when every plan subject is already there. */
export function nextSubjectFor(
  draft: TimetableDraft,
  day: number,
  subjectIds: readonly string[],
): string | null {
  const used = new Set(allocationsOn(draft, day).map((row) => row.allocation.subjectId));
  return subjectIds.find((id) => !used.has(id)) ?? null;
}

export function addAllocation(draft: TimetableDraft, allocation: Allocation): TimetableDraft {
  return { ...draft, allocations: [...draft.allocations, allocation] };
}

export function updateAllocation(
  draft: TimetableDraft,
  index: number,
  patch: Partial<Allocation>,
): TimetableDraft {
  return {
    ...draft,
    allocations: draft.allocations.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  };
}

export function removeAllocation(draft: TimetableDraft, index: number): TimetableDraft {
  return { ...draft, allocations: draft.allocations.filter((_, i) => i !== index) };
}

// ─── Validation (mirrors the backend; the backend decides) ──────────────────

export function validateDraft(draft: TimetableDraft, hours: PlanHours): TimetableIssue[] {
  const issues: TimetableIssue[] = [];
  const issue = (code: string, message: string, day: number | null = null, subjectId: string | null = null) =>
    issues.push({ code, message, day, subjectId });

  const overrides: Record<number, number> = {};
  for (const [key, minutes] of Object.entries(draft.dayMinutes)) {
    const day = Number(key);
    if (!hours.studyDays.includes(day)) {
      issue("REST_DAY", `${DAY_NAMES[day]} is a rest day, so it cannot have study time.`, day);
    } else if (minutes < SESSION_MINUTES) {
      issue("TOO_SHORT", `${DAY_NAMES[day]} needs at least ${SESSION_MINUTES} minutes, or make it a rest day.`, day);
    } else {
      overrides[day] = minutes;
    }
  }
  if (draft.mode === "SMART") return issues;

  if (draft.allocations.length === 0) {
    issue("NO_ALLOCATIONS", "Put at least one subject on a day, or keep the smart timetable.");
  }
  const seen = new Set<string>();
  const reserved: Record<number, number> = {};
  for (const row of draft.allocations) {
    const key = `${row.day}:${row.subjectId}`;
    if (!hours.studyDays.includes(row.day)) {
      issue("REST_DAY", `${DAY_NAMES[row.day]} is a rest day, so it cannot have a subject.`, row.day, row.subjectId);
    } else if (!hours.subjectIds.includes(row.subjectId)) {
      issue("SUBJECT_NOT_IN_PLAN", "A subject on your timetable is not part of this plan.", row.day, row.subjectId);
    } else if (seen.has(key)) {
      issue("DUPLICATE_ALLOCATION", `A subject is on ${DAY_NAMES[row.day]} more than once.`, row.day, row.subjectId);
    } else if (row.minutes !== null && (row.minutes < SESSION_MINUTES || row.minutes % SESSION_MINUTES !== 0)) {
      issue("BAD_STEP", `Subject time must be in steps of ${SESSION_MINUTES} minutes.`, row.day, row.subjectId);
    } else {
      seen.add(key);
      reserved[row.day] = (reserved[row.day] ?? 0) + reservedMinutes(row);
    }
  }
  for (const [key, total] of Object.entries(reserved)) {
    const day = Number(key);
    const capacity = dayCapacity(day, { dayMinutes: overrides }, hours);
    if (total > capacity) {
      issue(
        "OVER_CAPACITY",
        `${DAY_NAMES[day]} has ${total} minutes of subjects but only ${capacity} minutes of study time.`,
        day,
      );
    }
  }
  return issues;
}

export function issuesOnDay(issues: readonly TimetableIssue[], day: number): TimetableIssue[] {
  return issues.filter((row) => row.day === day);
}

/** Plan-level problems that belong to no single day. */
export function generalIssues(issues: readonly TimetableIssue[]): TimetableIssue[] {
  return issues.filter((row) => row.day === null);
}

// ─── Draft ↔ API ────────────────────────────────────────────────────────────

export function draftFromTimetable(timetable: TimetableData | null): TimetableDraft {
  if (!timetable) return { mode: "SMART", dayMinutes: {}, allocations: [] };
  return {
    mode: timetable.mode,
    dayMinutes: Object.fromEntries(timetable.dayMinutes.map((row) => [row.day, row.minutes])),
    allocations: timetable.allocations.map((row) => ({ ...row })),
  };
}

/**
 * What to send. Smart with no overrides is `null`, which tells the backend to
 * keep the plan on the smart timetable. Allocations are only sent in custom
 * mode, so switching back to Smart keeps nothing the planner would ignore, but
 * the draft still remembers them if the student switches again.
 */
export function timetableForSave(draft: TimetableDraft): TimetableData | null {
  const dayMinutes = Object.entries(draft.dayMinutes)
    .map(([day, minutes]) => ({ day: Number(day), minutes }))
    .sort((a, b) => a.day - b.day);
  const allocations =
    draft.mode === "CUSTOM"
      ? [...draft.allocations].sort((a, b) => a.day - b.day || a.subjectId.localeCompare(b.subjectId))
      : [];
  if (draft.mode === "SMART" && dayMinutes.length === 0) return null;
  return { version: 1, mode: draft.mode, dayMinutes, allocations };
}

/** A stable string for "did anything change": equal intent gives an equal string. */
export function timetableSignature(draft: TimetableDraft): string {
  return JSON.stringify(timetableForSave(draft));
}

// ─── Wire parsing (tolerant, like the rest of the plan loader) ───────────────

function wholeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAllocation(value: unknown): Allocation | null {
  if (!isRecord(value)) return null;
  const day = wholeNumber(value.day);
  if (day === null || day < 1 || day > 7 || typeof value.subjectId !== "string") return null;
  return {
    day,
    subjectId: value.subjectId,
    minutes: wholeNumber(value.minutes),
    strength: value.strength === "PINNED" ? "PINNED" : "PREFERRED",
  };
}

/** `null` for a smart or legacy plan, or anything that is not a timetable. */
export function parseTimetable(value: unknown): TimetableData | null {
  if (!isRecord(value)) return null;
  const allocations = (Array.isArray(value.allocations) ? value.allocations : [])
    .map(parseAllocation)
    .filter((row): row is Allocation => row !== null);
  const dayMinutesList = (Array.isArray(value.dayMinutes) ? value.dayMinutes : [])
    .filter(isRecord)
    .map((row) => ({ day: wholeNumber(row.day), minutes: wholeNumber(row.minutes) }))
    .filter((row): row is { day: number; minutes: number } => row.day !== null && row.minutes !== null);
  return {
    version: 1,
    mode: value.mode === "CUSTOM" ? "CUSTOM" : "SMART",
    dayMinutes: dayMinutesList,
    allocations,
  };
}

export type UnmetAllocation = {
  date: string;
  subjectId: string;
  strength: Strength;
  minutes: number;
  reason: string;
};

export function parseUnmet(value: unknown): UnmetAllocation[] {
  return (Array.isArray(value) ? value : []).filter(isRecord).flatMap((row) =>
    typeof row.date === "string" && typeof row.subjectId === "string"
      ? [
          {
            date: row.date.slice(0, 10),
            subjectId: row.subjectId,
            strength: row.strength === "PINNED" ? ("PINNED" as const) : ("PREFERRED" as const),
            minutes: wholeNumber(row.minutes) ?? SESSION_MINUTES,
            reason: typeof row.reason === "string" ? row.reason : "NO_ELIGIBLE_WORK",
          },
        ]
      : [],
  );
}

// ─── Preview response ───────────────────────────────────────────────────────

export type PreviewDay = {
  day: number;
  name: string;
  availableMinutes: number;
  allocatedMinutes: number;
  unallocatedMinutes: number;
  subjects: { subjectId: string; minutes: number; strength: Strength }[];
};

export type PreviewSummary = {
  mode: TimetableMode;
  weeklyAvailableMinutes: number;
  weeklyAllocatedMinutes: number;
  days: PreviewDay[];
  restDays: { day: number; name: string }[];
  coverage: { subjectId: string; daysPerWeek: number; minutesPerWeek: number; pinnedDays: number }[];
};

export type PreviewWindowItem = {
  date: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicTitle: string | null;
  activityType: string;
  durationMinutes: number;
  notes: string | null;
  carriedFrom: string | null;
};

export type PreviewWindow = {
  plannedThrough: string | null;
  items: PreviewWindowItem[];
  unmet: UnmetAllocation[];
  overload: { topicsBehind: number; suggestedExtraMinutesPerWeek: number } | null;
};

export type PlanPreview = {
  valid: boolean;
  errors: TimetableIssue[];
  warnings: TimetableIssue[];
  summary: PreviewSummary | null;
  window: PreviewWindow | null;
};

function parseIssues(value: unknown): TimetableIssue[] {
  return (Array.isArray(value) ? value : []).filter(isRecord).map((row) => ({
    code: typeof row.code === "string" ? row.code : "UNKNOWN",
    message: typeof row.message === "string" ? row.message : "Something is wrong with this plan.",
    day: wholeNumber(row.day),
    subjectId: typeof row.subjectId === "string" ? row.subjectId : null,
  }));
}

function parseSummary(value: unknown): PreviewSummary | null {
  if (!isRecord(value)) return null;
  const list = (raw: unknown) => (Array.isArray(raw) ? raw.filter(isRecord) : []);
  return {
    mode: value.mode === "CUSTOM" ? "CUSTOM" : "SMART",
    weeklyAvailableMinutes: wholeNumber(value.weeklyAvailableMinutes) ?? 0,
    weeklyAllocatedMinutes: wholeNumber(value.weeklyAllocatedMinutes) ?? 0,
    days: list(value.days).map((row) => ({
      day: wholeNumber(row.day) ?? 0,
      name: String(row.name ?? ""),
      availableMinutes: wholeNumber(row.availableMinutes) ?? 0,
      allocatedMinutes: wholeNumber(row.allocatedMinutes) ?? 0,
      unallocatedMinutes: wholeNumber(row.unallocatedMinutes) ?? 0,
      subjects: list(row.subjects).map((s) => ({
        subjectId: String(s.subjectId ?? ""),
        minutes: wholeNumber(s.minutes) ?? SESSION_MINUTES,
        strength: s.strength === "PINNED" ? ("PINNED" as const) : ("PREFERRED" as const),
      })),
    })),
    restDays: list(value.restDays).map((row) => ({
      day: wholeNumber(row.day) ?? 0,
      name: String(row.name ?? ""),
    })),
    coverage: list(value.coverage).map((row) => ({
      subjectId: String(row.subjectId ?? ""),
      daysPerWeek: wholeNumber(row.daysPerWeek) ?? 0,
      minutesPerWeek: wholeNumber(row.minutesPerWeek) ?? 0,
      pinnedDays: wholeNumber(row.pinnedDays) ?? 0,
    })),
  };
}

function parseWindow(value: unknown): PreviewWindow | null {
  if (!isRecord(value)) return null;
  const overload = isRecord(value.overload)
    ? {
        topicsBehind: wholeNumber(value.overload.topicsBehind) ?? 0,
        suggestedExtraMinutesPerWeek: wholeNumber(value.overload.suggestedExtraMinutesPerWeek) ?? 0,
      }
    : null;
  return {
    plannedThrough: typeof value.plannedThrough === "string" ? value.plannedThrough.slice(0, 10) : null,
    items: (Array.isArray(value.items) ? value.items : []).filter(isRecord).map((row) => ({
      date: String(row.date ?? "").slice(0, 10),
      subjectId: String(row.subjectId ?? ""),
      subjectName: String(row.subjectName ?? row.subjectId ?? ""),
      topicId: typeof row.topicId === "string" ? row.topicId : null,
      topicTitle: typeof row.topicTitle === "string" ? row.topicTitle : null,
      activityType: String(row.activityType ?? "LESSON"),
      durationMinutes: wholeNumber(row.durationMinutes) ?? 0,
      notes: typeof row.notes === "string" ? row.notes : null,
      carriedFrom: typeof row.carriedFrom === "string" ? row.carriedFrom.slice(0, 10) : null,
    })),
    unmet: parseUnmet(value.unmet),
    overload,
  };
}

export function parsePreview(value: unknown): PlanPreview {
  const body = isRecord(value) ? value : {};
  return {
    valid: body.valid === true,
    errors: parseIssues(body.errors),
    warnings: parseIssues(body.warnings),
    summary: parseSummary(body.summary),
    window: parseWindow(body.window),
  };
}

// ─── Wording ────────────────────────────────────────────────────────────────

export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Plain-language reason an allocation was not served, with what the student can do. */
export function unmetExplanation(reason: string, strength: Strength): string {
  if (reason === "NO_CAPACITY") {
    return "There was no free session left on that day. Add time to the day or move a subject.";
  }
  return strength === "PINNED"
    ? "Nothing was ready to study for this subject, so the session was left empty. Add study time elsewhere, loosen the pin, or choose another subject."
    : "Nothing was ready to study for this subject, so that time went to other work.";
}

export type UnmetGroup = {
  subjectId: string;
  strength: Strength;
  reason: string;
  dates: string[];
};

/** Unmet sessions per subject, so a two-week window reads as a short list. */
export function groupUnmet(unmet: readonly UnmetAllocation[]): UnmetGroup[] {
  const groups = new Map<string, UnmetGroup>();
  for (const row of unmet) {
    const key = `${row.subjectId}:${row.strength}:${row.reason}`;
    const group = groups.get(key) ?? {
      subjectId: row.subjectId,
      strength: row.strength,
      reason: row.reason,
      dates: [],
    };
    if (!group.dates.includes(row.date)) group.dates.push(row.date);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, dates: [...group.dates].sort() }));
}
