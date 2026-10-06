// Study-plan shapes as the backend sends them (`GET /api/study-plan`).

import type { Term } from "@/lib/curriculum-scope";

/** A calendar day as `YYYY-MM-DD`, in the student's Lagos civil day. */
export type DayKey = string;

export type PlanMode = "TERM" | "BLENDED" | "EXAM";

export type Overload = { topicsBehind: number; suggestedExtraMinutesPerWeek: number };

export type OutlineWeek = {
  weekStart: DayKey;
  label: string | null;
  topics: { subjectId: string; title: string }[];
};

export type TermSource = "configured" | "fallback";

export type TermRange = {
  session: string;
  term: Term;
  startsOn: DayKey;
  endsOn: DayKey;
};
