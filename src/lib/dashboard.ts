import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type {
  DashboardAttempt as ApiDashboardAttempt,
  DashboardGap,
  DashboardOut,
  DashboardPick,
  DashboardRevisionItem,
} from "@/lib/api/types";
import type { NextTopicRecommendation } from "@/types/learning";
import type { TopicGap } from "@/types/learning";
import type { RevisionQueueItem } from "@/types/learning";

/**
 * Dashboard read: one call to the backend's aggregate `GET /api/dashboard`,
 * which computes every figure, rail and pager total the page renders. This
 * module only narrows the payload to the page's shape — it derives nothing
 * the backend did not send, so the numbers cannot drift from the server's.
 */

/** A subject referenced by a learning-path card, keyed by id in the payload. */
export type DashboardSubject = {
  slug: string;
  name: string;
  code: string;
};

/**
 * A recent attempt as the dashboard renders it. `completedAt` is an ISO
 * string rather than a `Date` — the payload has to survive JSON, so it never
 * carries a live Date across the boundary.
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
  learningPicks: DashboardPick[];
  gaps: DashboardGap[];
  revision: DashboardRevisionItem[];
  /** Every topic due for revision, of which `revision` is the top slice. */
  revisionTotal: number;
};

/** Attempts per page in "Recent activity". Must match the backend's page size. */
export const DASHBOARD_ATTEMPTS_PAGE_SIZE = 5;

function asAttempt(row: ApiDashboardAttempt): DashboardAttempt {
  return {
    id: row.id,
    title: row.title ?? "",
    percentage:
      typeof row.percentage === "number" && Number.isFinite(row.percentage)
        ? row.percentage
        : null,
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
    totalResponses: dash.totalResponses ?? 0,
    accuracy: dash.accuracy ?? null,
    topicCount: dash.topicCount ?? 0,
    lastWeekActivity: dash.lastWeekActivity ?? 0,
    hasActivity: dash.hasActivity ?? false,
    hasStudyPlan: dash.hasStudyPlan ?? false,
    todayPlan,
    bestScore: dash.bestScore ?? null,
    recentAttempts: (dash.recentAttempts ?? []).map(asAttempt),
    attemptTotal: dash.attemptTotal ?? 0,
    subjects: dash.subjects ?? {},
    learningPicks: dash.learningPicks ?? [],
    gaps: dash.gaps ?? [],
    revision: dash.revision ?? [],
    revisionTotal: dash.revisionTotal ?? 0,
  };
}
