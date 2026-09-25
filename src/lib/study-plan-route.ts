import { api } from "@/lib/api/server";
import type { PlanPageOut, PlanSubjectRow } from "@/lib/api/types";
import type { ClassLevel } from "@/lib/curriculum-scope";
import type { DayKey } from "@/engines/planner/days";
import {
  DEFAULT_MINUTES,
  resolvePlanMode,
  type PlanMode,
} from "@/engines/planner/mode";
import type { Overload } from "@/engines/planner/layout";
import type { OutlineWeek } from "@/engines/planner/outline";
import type { TermSource } from "@/engines/planner/term-context";
import type {
  PositionOption,
  StudyPlanData,
  StudyPlanItemData,
  StudyPlanPageData,
  StudyPlanSubject,
} from "@/lib/study-plan";

/**
 * The study-plan page's server read. This module used to build NextResponses
 * for the plan's route handlers; the backend owns those writes (and the
 * entitlement check behind `GET /api/study-plan`'s 401/403) now, so what is
 * left is the typed read the page renders: `GET /api/study-plan`, mapped
 * tolerantly onto the shapes the client components already destructure.
 */

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

/** A DayKey off the wire: ISO date strings are truncated to `YYYY-MM-DD`. */
function asDayKey(value: unknown): DayKey | null {
  const s = str(value);
  if (!s) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return match ? match[1] : null;
}

function asClassLevel(value: unknown): ClassLevel | null {
  return value === "SS1" || value === "SS2" || value === "SS3" ? value : null;
}

function asTermSource(value: unknown): TermSource {
  return value === "configured" ? "configured" : "fallback";
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function asNumberList(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    : [];
}

function asSubject(row: Record<string, unknown>): StudyPlanSubject {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    code: String(row.code ?? ""),
    slug: String(row.slug ?? ""),
  };
}

function asItem(row: Record<string, unknown>): StudyPlanItemData {
  const subject =
    row.subject && typeof row.subject === "object"
      ? (row.subject as Record<string, unknown>)
      : {};
  return {
    id: String(row.id ?? ""),
    date: asDayKey(row.date) ?? asDayKey(row.scheduledDate) ?? "",
    subjectId: String(row.subjectId ?? ""),
    topicId: str(row.topicId),
    topicSlug: str(row.topicSlug),
    topicTitle: str(row.topicTitle),
    activityType: String(row.activityType ?? "LESSON"),
    durationMinutes: num(row.durationMinutes) ?? 0,
    status: String(row.status ?? "PENDING"),
    notes: str(row.notes),
    carriedFrom: asDayKey(row.carriedFrom) ?? asDayKey(row.carriedFromDate),
    completionSource: str(row.completionSource),
    subject: {
      name: String(subject.name ?? ""),
      code: String(subject.code ?? ""),
      slug: String(subject.slug ?? ""),
    },
  };
}

function asPositionOptions(
  value: unknown,
): Record<string, PositionOption[]> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, PositionOption[]> = {};
  for (const [subjectId, raw] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (!Array.isArray(raw)) continue;
    out[subjectId] = raw
      .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
      .map((row) => ({
        id: String(row.id ?? ""),
        title: String(row.title ?? ""),
        scope: String(row.scope ?? ""),
      }));
  }
  return out;
}

function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const s = str(raw);
    if (s !== null) out[key] = s;
  }
  return out;
}

function asNullableStringMap(value: unknown): Record<string, string | null> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = str(raw);
  }
  return out;
}

function asPlan(
  value: Record<string, unknown>,
  today: DayKey,
  classLevel: ClassLevel | null,
): StudyPlanData {
  const targetDate = asDayKey(value.targetDate);
  const forceExamMode = asBoolean(value.forceExamMode);
  const subjectIds = asStringList(value.subjectIds);
  const weekdayMinutes =
    num(value.weekdayMinutes) ?? DEFAULT_MINUTES[classLevel ?? "SS1"].weekdayMinutes;
  const weekendMinutes =
    num(value.weekendMinutes) ?? DEFAULT_MINUTES[classLevel ?? "SS1"].weekendMinutes;
  const mode: PlanMode =
    value.mode === "TERM" || value.mode === "BLENDED" || value.mode === "EXAM"
      ? value.mode
      : resolvePlanMode({ classLevel, targetDate, forceExamMode, today });

  return {
    id: String(value.id ?? ""),
    mode,
    subjectIds,
    studyDays: asNumberList(value.studyDays),
    weekdayMinutes,
    weekendMinutes,
    targetExam: str(value.targetExam),
    targetDate,
    forceExamMode,
    plannedThrough: asDayKey(value.plannedThrough),
    runwayStart: asDayKey(value.runwayStart),
    outline: Array.isArray(value.outline) ? (value.outline as OutlineWeek[]) : [],
    overload:
      value.overload && typeof value.overload === "object"
        ? (value.overload as Overload)
        : null,
    items: Array.isArray(value.items)
      ? value.items
          .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
          .map(asItem)
      : [],
    positions: asStringMap(value.positions),
    calendarPositions: asNullableStringMap(value.calendarPositions),
    positionOptions: asPositionOptions(value.positionOptions),
  };
}

/**
 * The study-plan page payload — `GET /api/study-plan`. The backend may
 * replan if the Lagos day has rolled before answering, so this is always the
 * current window. `plan` is null when the student has never created one.
 */
export async function getStudyPlanPageData(): Promise<StudyPlanPageData> {
  const data = await api<PlanPageOut>("/api/study-plan");

  const today = String(data.today ?? "");
  const classLevel = asClassLevel(data.classLevel);
  const fallbackDefaults = DEFAULT_MINUTES[classLevel ?? "SS1"];
  const rawDefaults =
    data.defaults && typeof data.defaults === "object"
      ? (data.defaults as Record<string, unknown>)
      : {};

  return {
    today,
    classLevel,
    termLabel: typeof data.termLabel === "string" ? data.termLabel : "",
    termSource: asTermSource(data.termSource),
    daysToExam: num(data.daysToExam),
    defaults: {
      weekdayMinutes: num(rawDefaults.weekdayMinutes) ?? fallbackDefaults.weekdayMinutes,
      weekendMinutes: num(rawDefaults.weekendMinutes) ?? fallbackDefaults.weekendMinutes,
    },
    subjects: (Array.isArray(data.subjects) ? data.subjects : [])
      .filter((row): row is PlanSubjectRow => typeof row === "object" && row !== null)
      .map(asSubject),
    plan:
      data.plan && typeof data.plan === "object"
        ? asPlan(data.plan as Record<string, unknown>, today, classLevel)
        : null,
  };
}
