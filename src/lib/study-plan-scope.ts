import { TERM_LABELS, type ClassLevel, type Term } from "./curriculum-scope";

// The class and term a study plan is for. It starts as the student's own class
// and the live term, but the student can plan for another one.

export type PlanScope = { classLevel: ClassLevel; term: Term };

export function defaultScope(
  profileClass: ClassLevel | null,
  currentTerm: Term | null,
): PlanScope {
  return { classLevel: profileClass ?? "SS1", term: currentTerm ?? "FIRST" };
}

/** Planning for a class other than the profile's is worth asking about. */
export function needsClassPrompt(chosen: ClassLevel, profile: ClassLevel | null): boolean {
  return profile !== null && chosen !== profile;
}

export function scopeHeader(
  scope: PlanScope,
  followsCalendar: boolean,
  termLabel: string,
): string {
  return `${scope.classLevel} · ${followsCalendar ? termLabel : TERM_LABELS[scope.term]}`;
}
