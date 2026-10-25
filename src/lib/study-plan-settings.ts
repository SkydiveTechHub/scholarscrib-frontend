import type { ClassLevel, Term } from "./curriculum-scope";
import { timetableSignature, type TimetableData, type TimetableDraft } from "./study-timetable";

/** What the setup form sends to create or change a plan. `timetable` is always sent. */
export type PlanSettings = {
  classLevel: ClassLevel;
  term: Term;
  subjectIds: string[];
  studyDays: number[];
  weekdayMinutes: number;
  weekendMinutes: number;
  targetExam: "WAEC" | "JAMB" | "NECO" | null;
  targetDate: string | null;
  forceExamMode: boolean;
  /** null keeps (or returns) the plan on the smart timetable. */
  timetable: TimetableData | null;
};

/** The form's working state: the settings plus the timetable being edited. */
export type PlanFormState = Omit<PlanSettings, "timetable"> & { draft: TimetableDraft };

function sorted<T>(values: readonly T[]): T[] {
  return [...values].sort();
}

/**
 * A stable string for "did anything change". Order of subjects and days does not
 * matter; the timetable compares by meaning, not by the order rows were added.
 */
export function formSignature(state: PlanFormState): string {
  return JSON.stringify([
    state.classLevel,
    state.term,
    sorted(state.subjectIds),
    sorted(state.studyDays),
    state.weekdayMinutes,
    state.weekendMinutes,
    state.targetExam,
    state.targetDate,
    state.forceExamMode,
    timetableSignature(state.draft),
  ]);
}
