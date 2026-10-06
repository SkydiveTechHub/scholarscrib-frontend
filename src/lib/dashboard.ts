import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type {
  DashboardAttempt as ApiDashboardAttempt,
  DashboardGap,
  DashboardOut,
  DashboardPick,
  DashboardRevisionItem,
} from "@/lib/api/types";

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
 * The dashboard read. `attemptPage` pages "Recent activity" — the backend
 * resolves the rest from the caller's session.
 */
export async function getDashboardData(
  attemptPage = 1,
): Promise<DashboardData> {
  const dash = await api<DashboardOut>(endpoints.dashboard, {
    params: { activity: attemptPage },
  });

  const items = Array.isArray(dash.todayItems) ? dash.todayItems : [];
  const todayPlan =
    items.length > 0
      ? {
          total: items.length,
          done: items.filter((item) => {
            const status = String(item.status ?? "").toUpperCase();
            return status === "COMPLETED" || status === "DONE";
          }).length,
        }
      : null;

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
