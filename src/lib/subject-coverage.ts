// Pure helpers for the past-question picker's catalogue data
// (`/api/questions/catalogue/*`). Subjects are ours, so the track filter uses
// our own `track_category` directly, whichever provider is active.

import type { CatalogueSubjectOut, CatalogueYearOut } from "@/lib/api/types";
import { isRelevantSubject } from "@/lib/subjects";

/** The exams a student can pick, keyed as the catalogue data spells them. */
export const COVERAGE_EXAMS = [
  { key: "jamb", label: "JAMB" },
  { key: "waec", label: "WAEC" },
  { key: "neco", label: "NECO" },
  // Post-UTME is left out on purpose: attempts are recorded against our
  // ExamType, which has no Post-UTME value.
] as const;

export function subjectsForExam(
  subjects: readonly CatalogueSubjectOut[],
  exam: string,
): CatalogueSubjectOut[] {
  return subjects
    .filter((s) => s.examTypes.includes(exam))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Whether a subject belongs on a student's track. CORE subjects (English,
 * Maths) are always included. A student with no track (or one we don't
 * recognise) is shown everything rather than a guess.
 */
export function isTrackSubject(
  subject: Pick<CatalogueSubjectOut, "category">,
  track?: string | null,
): boolean {
  return isRelevantSubject(subject.category, track);
}

/**
 * The years on offer for an exam, newest first. A year whose question count is
 * unknown (null) is kept: the paper exists, we just haven't counted it yet.
 */
export function yearsForExam(
  years: readonly CatalogueYearOut[],
): { year: number; questionCount: number | null }[] {
  return years
    .filter((y) => y.questionCount === null || y.questionCount > 0)
    .map((y) => ({ year: y.year, questionCount: y.questionCount }))
    .sort((a, b) => b.year - a.year);
}
