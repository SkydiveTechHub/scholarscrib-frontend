// Pure rules for when practice should warn before it starts: past questions
// and the JAMB CBT cover the whole syllabus, so a younger student can meet
// material they haven't been taught, and a subject outside their track is
// off their path. Either can drag down their performance record.

import { isTrackSubject } from "@/lib/subject-coverage";

/** Classes that haven't yet covered the full UTME/WAEC syllabus. */
const BEYOND_SCOPE_CLASSES = ["SS1", "SS2"];

export type PracticeWarnings = {
  beyondClass: boolean;
  offTrack: boolean;
  /** Display names of the off-track subjects, for the warning copy. */
  offTrackSubjects: string[];
};

export type WarnableSubject = { name: string; category: string; label: string };

export function practiceWarnings({
  classLevel,
  track,
  subjects,
  checkClass = true,
}: {
  classLevel?: string | null;
  track?: string | null;
  subjects: readonly WarnableSubject[];
  /** False when the attempt isn't starting yet, so only the track is checked. */
  checkClass?: boolean;
}): PracticeWarnings {
  const beyondClass =
    checkClass && !!classLevel && BEYOND_SCOPE_CLASSES.includes(classLevel.toUpperCase());
  const off = subjects.filter((s) => !isTrackSubject(s, track));
  return {
    beyondClass,
    offTrack: off.length > 0,
    offTrackSubjects: off.map((s) => s.label),
  };
}

export function hasWarning(w: PracticeWarnings): boolean {
  return w.beyondClass || w.offTrack;
}
