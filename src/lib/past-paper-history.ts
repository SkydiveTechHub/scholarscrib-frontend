import type { PastPaperAttemptOut, PastPaperHistoryOut } from "@/lib/api/types";

export type YearTrend = "up" | "down" | "flat" | null;

/** How a sitting is scored: a percentage, or raw marks out of the paper's total. */
export type ScoreUnit = "percent" | "marks";

export type YearSummary = {
  unit: ScoreUnit;
  count: number;
  /** Oldest first. */
  attempts: PastPaperAttemptOut[];
  /** Each attempt's score in `unit`, rounded; same order as `attempts`. */
  scores: number[];
  /** Highest score across attempts; null when there are none. */
  best: number | null;
  /** The paper's total marks, for the "marks" unit. */
  total: number | null;
  /** Last attempt against the one before it; null with a single attempt. */
  trend: YearTrend;
};

function scoreIn(attempt: PastPaperAttemptOut, unit: ScoreUnit): number {
  const value = unit === "marks" ? attempt.score : attempt.percentage;
  return Math.round(value ?? 0);
}

export function summariseYear(
  attempts: PastPaperAttemptOut[],
  unit: ScoreUnit = "percent",
): YearSummary {
  const scores = attempts.map((a) => scoreIn(a, unit));
  let trend: YearTrend = null;
  if (scores.length >= 2) {
    const delta = scores[scores.length - 1] - scores[scores.length - 2];
    trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  }
  return {
    unit,
    count: attempts.length,
    attempts,
    scores,
    best: scores.length ? Math.max(...scores) : null,
    total: attempts.find((a) => a.totalMarks)?.totalMarks ?? null,
    trend,
  };
}

/** Summaries keyed by year; years never attempted are simply absent. */
export function summariseHistory(
  history: PastPaperHistoryOut | undefined,
  unit: ScoreUnit = "percent",
) {
  const byYear = new Map<number, YearSummary>();
  for (const { year, attempts } of history?.years ?? []) {
    if (attempts.length > 0) byYear.set(year, summariseYear(attempts, unit));
  }
  return byYear;
}

/** "72%" or "288/400". */
export function formatScore(summary: YearSummary, score: number): string {
  if (summary.unit === "percent") return `${score}%`;
  return summary.total ? `${score}/${Math.round(summary.total)}` : `${score}`;
}

/** The change between attempts: "+6%" or "+18 marks". */
export function formatChange(summary: YearSummary, change: number): string {
  const sign = change > 0 ? "+" : "";
  return summary.unit === "percent" ? `${sign}${change}%` : `${sign}${change} marks`;
}

/** The modal's one-line read on how the student is doing. */
export function progressHeadline(summary: YearSummary): string {
  const { scores } = summary;
  if (scores.length < 2) return "Take it again to see whether you're improving.";
  const gain = scores[scores.length - 1] - scores[0];
  const points = summary.unit === "percent" ? "points" : "marks";
  if (gain > 0) return `You've improved ${gain} ${points} since your first try 🎉`;
  if (gain < 0) return "Your score is below your first try. Review the questions you missed before retrying.";
  return "Same score as your first try. Review your wrong answers before retrying.";
}
