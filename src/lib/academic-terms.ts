import { addDays } from "@/lib/day-keys";
import type { DayKey, TermRange } from "@/types/study-plan";

export type AcademicTermRow = TermRange & { id: string };

/** Whether a configured term covers any day from today through `aheadDays` from now. */
export function hasTermCoverage(
  configured: readonly TermRange[],
  today: DayKey,
  aheadDays = 30,
): boolean {
  const until = addDays(today, aheadDays);
  return configured.some((t) => t.startsOn <= until && t.endsOn >= today);
}
