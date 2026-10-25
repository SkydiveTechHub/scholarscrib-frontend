import type { ClassLevel, Term } from "./curriculum-scope";
import type { PlanScope } from "./study-plan-scope";
import type { DayKey } from "@/types/study-plan";
import type { PlanMode } from "@/types/study-plan";
import type { OutlineWeek } from "@/types/study-plan";
import type { Overload } from "@/types/study-plan";
import type { TermSource } from "@/types/study-plan";
import type { TimetableData, UnmetAllocation } from "./study-timetable";

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
  scope: PlanScope;
  /** True while the plan's term is the live school term for the student's class. */
  followsCalendar: boolean;
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
  /** The student's own timetable; null on a smart plan (and on plans made before timetables). */
  timetable: TimetableData | null;
  /** Timetable sessions the last replan could not give to their subject. */
  unmet: UnmetAllocation[];
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
  currentTerm: Term;
  termLabel: string;
  termSource: TermSource;
  daysToExam: number | null;
  defaults: { weekdayMinutes: number; weekendMinutes: number };
  subjects: StudyPlanSubject[];
  plan: StudyPlanData | null;
};
