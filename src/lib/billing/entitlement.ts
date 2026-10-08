import type { SubscriptionTier } from "@/lib/subscription";

/** The tier the backend says the account holds right now. */
export type Entitlement = {
  tier: SubscriptionTier;
  /** When the granting tier lapses, or null when nothing is granted. */
  expiresAt: Date | null;
};

// ─── Admin analytics ──────────────────────────────────────
//
// The backend decides what a student may access. This mirror of its cover rule
// exists only so the admin analytics can ask "who was a subscriber on that
// date?" over the raw subscription rows. Never gate a feature on it.

import {
  SUBSCRIPTION_TIERS,
  type SubscriptionStatus,
} from "@/lib/subscription";

export type EntitlementRow = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startsAt: Date | null;
  endsAt: Date | null;
};

function covers(row: EntitlementRow, now: number): boolean {
  if (row.status !== "ACTIVE") return false;
  // A row with no end is not an endless grant — it is an unfinished write.
  if (!row.endsAt) return false;
  if (row.startsAt && row.startsAt.getTime() > now) return false;
  // Exclusive: a term ending at exactly `now` has ended.
  return row.endsAt.getTime() > now;
}

/** The tier a set of subscription rows grants at `now`; richest wins. */
export function resolveTier(
  rows: readonly EntitlementRow[],
  now: Date,
): Entitlement {
  const live = rows.filter((row) => covers(row, now.getTime()));
  if (live.length === 0) return { tier: "FREEMIUM", expiresAt: null };

  const rank = (tier: SubscriptionTier) => SUBSCRIPTION_TIERS.indexOf(tier);
  const tier = live.reduce(
    (best, row) => (rank(row.tier) > rank(best) ? row.tier : best),
    live[0].tier,
  );
  const expiresAt = live
    .filter((row) => row.tier === tier)
    .reduce<Date | null>(
      (furthest, row) =>
        !furthest || row.endsAt!.getTime() > furthest.getTime()
          ? row.endsAt!
          : furthest,
      null,
    );
  return { tier, expiresAt };
}
