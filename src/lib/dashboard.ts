import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type {
  DashboardAttempt as ApiDashboardAttempt,
  DashboardOut,
  PerformanceOut,
} from "@/lib/api/types";
import type { NextTopicRecommendation } from "@/types/learning";
import type { TopicGap } from "@/types/learning";
import type { RevisionQueueItem } from "@/types/learning";

/**
 * Dashboard read, composed from the backend's aggregate endpoints. The
 * home-page payload (`/api/dashboard`) carries the profile, streak, tier,
 * keep-learning rail, gaps, today's study-plan items and recent attempts; the
 * headline figures it does not guarantee — total questions answered, covered
 * topics, accuracy, weekly activity — are folded in from `/api/performance`,
 * which sums per-subject metrics. Every degraded field is noted at the bottom
 * of this file so the backend team knows which aggregates the page still
 * misses.
 */

/** A subject referenced by a learning-path card, keyed by id in the payload. */
export type DashboardSubject = {
  slug: string;
  name: string;
  code: string;
};

/**
 * A recent attempt as the dashboard renders it. `assessment.title` is flattened
 * to `title`, and `completedAt` is an ISO string rather than a `Date` — the
 * payload has to survive JSON, so it never carries a live Date across the
 * boundary.
 */
export type DashboardAttempt = {
  id: string;
  title: string;
  percentage: number | null;
  completedAt: string | null;
};

/** Everything the dashboard renders. JSON-representable end to end. */
export type DashboardData = {
  totalResponses: number;
  accuracy: number | null;
  topicCount: number;
  lastWeekActivity: number;
  hasActivity: boolean;
  hasStudyPlan: boolean;
  /** Today's study plan sessions, when the active plan has any today. */
  todayPlan: { done: number; total: number } | null;
  bestScore: number | null;
  /** One page of completed attempts, newest first. */
  recentAttempts: DashboardAttempt[];
  /** Completed attempts in total, for the activity pager. */
  attemptTotal: number;
  subjects: Record<string, DashboardSubject>;
  learningPicks: NextTopicRecommendation[];
  gaps: TopicGap[];
  revision: RevisionQueueItem[];
};

/** How many cards the "Keep learning" rail shows. */
const KEEP_LEARNING_K = 3;

/** Attempts per page in the dashboard's "Recent activity" section. */
export const DASHBOARD_ATTEMPTS_PAGE_SIZE = 5;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function asAttempt(row: ApiDashboardAttempt): DashboardAttempt {
  return {
    id: row.id,
    title: row.title ?? "",
    percentage: num(row.percentage),
    completedAt: row.completedAt ?? null,
  };
}

/**
 * The keep-learning rail arrives as a single recommendation or a list; the
 * existing rail component wants an array of its engine-shaped rows, so normalise
 * here and copy through whatever the backend included.
 */
function asLearningPicks(
  value: unknown,
): NextTopicRecommendation[] {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  return rows.slice(0, KEEP_LEARNING_K).map((row) => {
    const r = row as Record<string, unknown>;
    const mastery = num(r.mastery) ?? (num(r.accuracy) ?? 0);
    return {
      topicId: str(r.topicId),
      subjectId: str(r.subjectId ?? r.subject_id),
      title: str(r.title ?? r.topicTitle),
      slug: str(r.slug ?? r.topicSlug),
      mastery,
      score: num(r.score) ?? 0,
      reason: str(r.reason ?? "High-yield next step"),
      factors: {
        urgency: 0,
        leverage: 0,
        decay: 0,
        readiness: 0,
        freshness: 0,
      },
      unlocks: num(r.unlocks) ?? 0,
      confidence: num(r.confidence) ?? (mastery > 0 ? 0 : 0),
      accObservations: num(r.accObservations) ?? 0,
      lessonObservations: num(r.lessonObservations) ?? 0,
      srsObservations: num(r.srsObservations) ?? 0,
      lastStudy: r.lastStudy ? str(r.lastStudy) : null,
    };
  });
}

function asGaps(value: unknown): TopicGap[] {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      topicId: str(r.topicId),
      subjectId: str(r.subjectId ?? r.subject_id),
      title: str(r.title ?? r.topicTitle),
      slug: str(r.slug ?? r.topicSlug),
      category: (["WEAK", "DECAYED", "BOTTLENECK", "ABANDONED", "UNTOUCHED"] as const)
        .includes(r.category as never)
        ? (r.category as TopicGap["category"])
        : "WEAK",
      mastery: num(r.mastery) ?? (num(r.accuracy) ?? 0),
      retention: num(r.retention),
      bottleneckScore: num(r.bottleneckScore) ?? 0,
      blockedCount: num(r.blockedCount) ?? 0,
      confidence: num(r.confidence) ?? 0,
      accObservations: num(r.accObservations) ?? 0,
      lessonObservations: num(r.lessonObservations) ?? 0,
      srsObservations: num(r.srsObservations) ?? 0,
      lastStudy: r.lastStudy ? str(r.lastStudy) : null,
      abandonedCount: num(r.abandonedCount) ?? 0,
    };
  });
}

/**
 * The dashboard read. `attemptPage` pages "Recent activity" the way the old
 * loader did — the backend resolves it from the caller's session.
 *
 * Dashboard and performance are fetched in parallel so the page does not pay
 * two backend round-trips back-to-back (that waterfall was the main reason
 * `/dashboard` felt multi-second even when each call was fine on its own).
 */
export async function getDashboardData(
  _userId: string,
  attemptPage = 1,
): Promise<DashboardData> {
  const [dash, perfResult] = await Promise.all([
    api<DashboardOut>(endpoints.dashboard, {
      params: { activity: attemptPage },
    }),
    // Headline counts come from the performance aggregate. Fire it with the
    // dashboard read; ignore failures so a slow/broken performance endpoint
    // cannot take the whole home page down.
    api<PerformanceOut>(endpoints.performance, { params: { page: 1 } }).then(
      (perf) => ({ ok: true as const, perf }),
      (error: unknown) => {
        console.error("Dashboard performance read failed:", error);
        return { ok: false as const };
      },
    ),
  ]);
  const recentAttempts = (dash.recentAttempts ?? []).map(asAttempt);

  const hasActivity =
    recentAttempts.length > 0 ||
    Boolean(dash.keepLearning) ||
    (dash.gaps?.length ?? 0) > 0 ||
    (dash.todayItems?.length ?? 0) > 0;

  const todayPlan = Array.isArray(dash.todayItems)
    ? (() => {
        const total = dash.todayItems.length;
        if (total === 0) return null;
        const done = dash.todayItems.filter((item) => {
          const status = String((item as Record<string, unknown>).status ?? "").toUpperCase();
          return status === "COMPLETED" || status === "DONE";
        }).length;
        return { done, total };
      })()
    : null;

  let totalResponses = 0;
  let accuracy: number | null = null;
  const pathSubjects: Record<string, DashboardSubject> = {};
  if (hasActivity && perfResult.ok) {
    let answered = 0;
    let correct = 0;
    for (const subject of perfResult.perf.subjects ?? []) {
      const attempted = subject.totalAttempted ?? 0;
      answered += attempted;
      const c = subject.totalCorrect ?? 0;
      correct += c;
      const meta = {
        slug: subject.slug ?? "",
        name: subject.name ?? "",
        code: subject.code ?? "",
      };
      if (subject.id) pathSubjects[subject.id] = meta;
      if (meta.slug) pathSubjects[meta.slug] = meta;
    }
    totalResponses = answered;
    if (answered > 0) {
      accuracy = Math.round((correct / answered) * 100);
    }
  }

  const keepLearning = asLearningPicks(dash.keepLearning);
  const gaps = asGaps(dash.gaps);
  const coveredTopicIds = new Set<string>([
    ...keepLearning.map((pick) => pick.topicId),
    ...gaps.map((gap) => gap.topicId),
  ].filter(Boolean));
  const topicCount =
    coveredTopicIds.size > 0
      ? coveredTopicIds.size
      : Object.keys(pathSubjects).length > 0
        ? Object.keys(pathSubjects).length
        : 0;

  const bestScore = recentAttempts.reduce<number | null>(
    (best, attempt) =>
      attempt.percentage !== null
        ? Math.max(best ?? -1, attempt.percentage)
        : best,
    null,
  );

  return {
    totalResponses,
    accuracy,
    topicCount,
    // The backend does not return a bounded "this week" count, so the newest
    // page of recent attempts is the closest honest figure available.
    lastWeekActivity: recentAttempts.length,
    hasActivity,
    // todayItems only exists when the active plan has items today; an empty
    // list cannot be told apart from "no plan" on this contract.
    hasStudyPlan: (dash.todayItems?.length ?? 0) > 0,
    todayPlan,
    bestScore,
    recentAttempts,
    attemptTotal: recentAttempts.length,
    subjects: pathSubjects,
    learningPicks: keepLearning,
    gaps,
    // The merged flashcard + cadence revision queue has no aggregate endpoint;
    // the "Revise today" rail falls back to its empty state until one ships.
    revision: [],
  };
}

/*
 * Fields this page still reads that no backend endpoint currently guarantees:
 *   - totalResponses / accuracy            -> approximated from /api/performance sums
 *   - topicCount                           -> distinct topic ids in the rails, else subject count
 *   - lastWeekActivity                     -> count of the newest recent attempts
 *   - hasStudyPlan vs empty todayItems     -> indistinguishable on this contract
 *   - attemptTotal (recent-activity pager) -> set to the returned attempt count
 *   - revision (merged revision queue)     -> not returned; rail shows its empty state
 */