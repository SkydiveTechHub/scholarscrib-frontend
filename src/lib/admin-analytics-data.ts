import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import {
  buildMonthlySeries,
  compare,
  comparisonWindows,
  conversionRate,
  monthStart,
  renewalHealth,
  revenueIn,
  sameInstantLastMonth,
  subscribersAt,
  topSegments,
  trailingMonths,
  type AnalyticsSubscriptionRow,
  type Comparison,
  type MonthlyPoint,
  type RenewalHealth,
  type Segment,
} from "./admin-analytics";
import { CLASS_LEVELS } from "./curriculum-scope";
import type { SubscriptionSource, SubscriptionStatus, SubscriptionTier } from "./subscription";

/**
 * Backend read for the analytics panel on the admin overview. The rules live in
 * `admin-analytics`; the backend only counts rows. The windows are computed
 * here and sent over, so "this month so far" has a single definition.
 */

const MONTHS_SHOWN = 12;
/** Long enough for a signup to have had a fair chance to convert. */
export const FUNNEL_DAYS = 90;
const STATES_SHOWN = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AdminAnalytics = {
  kpis: {
    students: Comparison;
    signups: Comparison;
    subscribers: Comparison & { paid: number };
    revenueKobo: Comparison;
    activeLearners: Comparison;
    assessments: Comparison;
    conversion: Comparison;
  };
  series: MonthlyPoint[];
  renewals: RenewalHealth;
  /** Students who signed up in the last FUNNEL_DAYS, and how far each got. */
  funnel: { signedUp: number; practised: number; assessed: number; paid: number };
  byClassLevel: Segment[];
  byState: Segment[];
};

type MonthCount = { month: string; n: number };
type SegmentRow = { label: string | null; students: number; subscribers: number };
type CurPrev = { cur: number; prev: number };

type AnalyticsPayload = {
  users: CurPrev & { total: number; before: number; lastMonth: number };
  signupsByMonth: MonthCount[];
  learners: CurPrev;
  learnersByMonth: MonthCount[];
  assessments: CurPrev;
  assessmentsByMonth: MonthCount[];
  subscriptions: {
    userId: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    source: SubscriptionSource;
    amountKobo: number;
    paidAt: string | null;
    startsAt: string | null;
    endsAt: string | null;
  }[];
  classLevels: SegmentRow[];
  states: SegmentRow[];
  funnel: AdminAnalytics["funnel"];
};

const toMap = (rows: MonthCount[]) => new Map(rows.map((r) => [r.month, r.n]));
const toDate = (value: string | null) => (value ? new Date(value) : null);

export async function getAdminAnalytics(now: Date = new Date()): Promise<AdminAnalytics> {
  const months = trailingMonths(now, MONTHS_SHOWN);
  const since = monthStart(months[0]);
  const { current, previous } = comparisonWindows(now);
  const lastMonth = sameInstantLastMonth(now);
  const cohortStart = new Date(now.getTime() - FUNNEL_DAYS * DAY_MS);

  const data = await api<AnalyticsPayload>(endpoints.admin.analytics, {
    realm: "admin",
    params: {
      now: now.toISOString(),
      since: since.toISOString(),
      currentStart: current.start.toISOString(),
      previousStart: previous.start.toISOString(),
      previousEnd: previous.end.toISOString(),
      lastMonth: lastMonth.toISOString(),
      cohortStart: cohortStart.toISOString(),
    },
  });

  const subscriptions: AnalyticsSubscriptionRow[] = data.subscriptions.map((row) => ({
    userId: row.userId,
    tier: row.tier,
    status: row.status,
    source: row.source,
    amountKobo: row.amountKobo,
    paidAt: toDate(row.paidAt),
    startsAt: toDate(row.startsAt),
    endsAt: toDate(row.endsAt),
  }));

  const subsNow = subscribersAt(subscriptions, now);
  const subsLastMonth = subscribersAt(subscriptions, lastMonth);

  const series = buildMonthlySeries({
    months,
    now,
    usersBefore: data.users.before,
    signupsByMonth: toMap(data.signupsByMonth),
    activeLearnersByMonth: toMap(data.learnersByMonth),
    assessmentsByMonth: toMap(data.assessmentsByMonth),
    subscriptions,
  });

  // Classes keep their natural SS1 → SS3 order; only states are ranked.
  const byClassLevel = [...CLASS_LEVELS, null].map((level): Segment => {
    const r = data.classLevels.find((c) => c.label === level);
    const students = r?.students ?? 0;
    const subscribers = r?.subscribers ?? 0;
    return {
      label: level ?? "Not set",
      students,
      subscribers,
      conversion: conversionRate(subscribers, students),
    };
  });

  return {
    kpis: {
      students: compare(data.users.total, data.users.lastMonth),
      signups: compare(data.users.cur, data.users.prev),
      subscribers: { ...compare(subsNow.total, subsLastMonth.total), paid: subsNow.paid },
      revenueKobo: compare(revenueIn(subscriptions, current), revenueIn(subscriptions, previous)),
      activeLearners: compare(data.learners.cur, data.learners.prev),
      assessments: compare(data.assessments.cur, data.assessments.prev),
      conversion: compare(
        conversionRate(subsNow.total, data.users.total),
        conversionRate(subsLastMonth.total, data.users.lastMonth),
      ),
    },
    series,
    renewals: renewalHealth(subscriptions, now),
    funnel: data.funnel,
    byClassLevel,
    byState: topSegments(data.states, STATES_SHOWN),
  };
}
