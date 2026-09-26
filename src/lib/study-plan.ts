import type { ClassLevel } from "./curriculum-scope";
import type { DayKey } from "@/types/study-plan";
import type { PlanMode } from "@/types/study-plan";
import type { OutlineWeek } from "@/types/study-plan";
import type { Overload } from "@/types/study-plan";
import type { TermSource } from "@/types/study-plan";

// Study plan page shapes. The loader that feeds these lives in
// `study-plan-route.ts` (a read of `GET /api/study-plan`); settings, positions
// and item status are written by the client straight to the backend routes.
// The rolling re-plan engine moved to the backend with them — see
// docs/backend-port/08-study-plan.md.

export type StudyPlanSubject = { id: string; name: string; code: string; slug: string };

export type StudyPlanItemData = {
  id: string;
  date: DayKey;
  subjectId: string;
  topicId: string | null;
  topicSlug: string | null;
  topicTitle: string | null;
  activityType: string;
  durationMinutes: number;
  status: string;
  notes: string | null;
  carriedFrom: DayKey | null;
  completionSource: string | null;
  subject: { name: string; code: string; slug: string };
};

export type PositionOption = { id: string; title: string; scope: string };

export type StudyPlanData = {
  id: string;
  mode: PlanMode;
  subjectIds: string[];
  studyDays: number[];
  weekdayMinutes: number;
  weekendMinutes: number;
  targetExam: string | null;
  targetDate: DayKey | null;
  forceExamMode: boolean;
  plannedThrough: DayKey | null;
  runwayStart: DayKey | null;
  outline: OutlineWeek[];
  overload: Overload | null;
  items: StudyPlanItemData[];
  /** subjectId → the student's override, if any. */
  positions: Record<string, string>;
  /** subjectId → where the calendar thinks the class is. */
  calendarPositions: Record<string, string | null>;
  /** subjectId → topics the student may choose as "my class is here". */
  positionOptions: Record<string, PositionOption[]>;
};

export type StudyPlanPageData = {
  today: DayKey;
  classLevel: ClassLevel | null;
  termLabel: string;
  termSource: TermSource;
  daysToExam: number | null;
  defaults: { weekdayMinutes: number; weekendMinutes: number };
  subjects: StudyPlanSubject[];
  plan: StudyPlanData | null;
};
