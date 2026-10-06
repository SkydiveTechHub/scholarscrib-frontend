// Pure helpers for the past-question picker's coverage data
// (`/api/questions/coverage/subjects`). The provider groups subjects into its
// own categories, not our SCIENCE / ARTS / COMMERCIAL tracks, so the mapping
// between the two lives here.

import type { CoverageSubjectOut } from "@/lib/api/types";
import { TRACK_CATEGORIES, type TrackCategory } from "@/lib/subjects";

/** The exams a student can pick, keyed as the coverage data spells them. */
export const COVERAGE_EXAMS = [
  { key: "jamb", label: "JAMB" },
  { key: "waec", label: "WAEC" },
  { key: "neco", label: "NECO" },
  // Post-UTME is left out on purpose: attempts are recorded against our
  // ExamType, which has no Post-UTME value.
] as const;

/**
 * Provider categories that belong to each track. Social sciences sit with
 * both Arts and Commercial: Government, Geography and Civic Education are
 * offered on either side.
 */
const TRACK_TO_COVERAGE: Record<TrackCategory, readonly string[]> = {
  CORE: [],
  SCIENCE: ["sciences"],
  ARTS: ["arts", "social-sciences", "languages"],
  COMMERCIAL: ["commercial", "social-sciences"],
  VOCATIONAL: ["general"],
};

/** Every candidate sits these, whatever their track. */
const COMPULSORY_SUBJECTS = ["english-language", "mathematics"];

export function subjectsForExam(
  subjects: readonly CoverageSubjectOut[],
  exam: string,
): CoverageSubjectOut[] {
  return subjects
    .filter((s) => s.examTypes.includes(exam))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Whether a subject belongs on a student's track. A student with no track
 * (or one we don't recognise) is shown everything rather than a guess.
 */
export function isTrackSubject(
  subject: Pick<CoverageSubjectOut, "name" | "category">,
  track?: string | null,
): boolean {
  if (!track || !TRACK_CATEGORIES.includes(track as TrackCategory)) return true;
  if (COMPULSORY_SUBJECTS.includes(subject.name)) return true;
  return TRACK_TO_COVERAGE[track as TrackCategory].includes(subject.category);
}

/** Every year in the subject's range, newest first. */
export function coverageYears(subject: CoverageSubjectOut): number[] {
  const { min, max } = subject.yearRange;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) return [];
  const years: number[] = [];
  for (let y = max; y >= min; y--) years.push(y);
  return years;
}
