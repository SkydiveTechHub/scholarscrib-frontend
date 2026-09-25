import { api } from "@/lib/api/server";
import type { DashboardAttempt, PerformanceOut } from "@/lib/api/types";

/** A completed attempt as the performance page lists it. Dates are ISO strings. */
export type PerformanceAttempt = {
  id: string;
  title: string;
  subjectName: string | null;
  percentage: number | null;
  score: number | null;
  totalMarks: number | null;
  completedAt: string | null;
};

/** Per-subject accuracy, from the backend's subject metrics. */
export type PerformanceSubjectMetric = {
  subjectName: string;
  subjectSlug: string;
  subjectCode: string;
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number;
};

export type PerformanceData = {
  /** One page of completed attempts, newest first. */
  attempts: PerformanceAttempt[];
  /** Completed attempts in total, for the pager and the attempt counter. */
  attemptTotal: number;
  /**
   * Score of the newest completed attempt, kept separate so the stat row can
   * keep showing the latest grade while the reader is on page 3 of the history.
   */
  latestPercentage: number | null;
  subjectMetrics: PerformanceSubjectMetric[];
};

/** Attempts per page in the performance history. */
export const PERFORMANCE_ATTEMPTS_PAGE_SIZE = 10;

/** WAEC-style grade boundaries. Domain rule, not presentation. */
export function getGrade(percentage: number): string {
  if (percentage >= 75) return "A";
  if (percentage >= 65) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asAttempt(row: DashboardAttempt): PerformanceAttempt {
  return {
    id: row.id,
    title: row.title ?? "",
    subjectName: row.subjectName ?? null,
    percentage: num(row.percentage),
    score: num(row.score),
    totalMarks: num(row.totalMarks),
    completedAt: row.completedAt ?? null,
  };
}

function asSubjectMetric(row: {
  id?: string;
  slug?: string;
  code?: string;
  name?: string;
  accuracy?: number;
  totalAttempted?: number;
  totalCorrect?: number;
}): PerformanceSubjectMetric {
  const accuracy = num(row.accuracy) ?? 0;
  return {
    subjectName: row.name ?? "",
    subjectSlug: row.slug ?? "",
    subjectCode: row.code ?? "",
    totalAttempted: row.totalAttempted ?? 0,
    totalCorrect: row.totalCorrect ?? 0,
    accuracy: accuracy > 0 && accuracy <= 1 ? accuracy * 100 : accuracy,
  };
}

/**
 * The performance read in one round trip — `GET /api/performance` serves the
 * paged attempts plus per-subject metrics, keyed off the token's session.
 */
export async function getPerformanceData(
  /**
   * One-indexed page of the attempt history. Trusted only as a hint: it comes
   * from `?page=`, so it is floored at 1 here and clamped against the real
   * total by `pageWindow` at render time.
   */
  attemptPage = 1,
): Promise<PerformanceData> {
  const page = Math.max(1, Math.floor(attemptPage));
  const data = await api<PerformanceOut>("/api/performance", {
    params: { page, pageSize: PERFORMANCE_ATTEMPTS_PAGE_SIZE },
  });

  const attempts = (data.attempts ?? []).map(asAttempt);
  return {
    attempts,
    attemptTotal: data.attemptTotal ?? attempts.length,
    latestPercentage: attempts[0]?.percentage ?? null,
    subjectMetrics: (data.subjects ?? []).map(asSubjectMetric),
  };
}