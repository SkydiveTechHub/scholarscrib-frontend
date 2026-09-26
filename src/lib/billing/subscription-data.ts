/**
 * Billing reads for the app. Every write — checkout, webhook settlement,
 * comps, revocation — happens on the backend now; the only thing the frontend
 * needs to know is what the backend says the caller is entitled to.
 */

import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type { SettingsProfileOut } from "@/lib/api/types";
import { isSubscriptionTier, type SubscriptionTier } from "@/lib/subscription";
import type { Entitlement } from "@/lib/billing/entitlement";

/**
 * What the caller's plan currently grants, straight from the backend (the
 * same profile read that feeds Settings, so tier and expiry cannot diverge
 * from what the rest of the app shows). The backend resolves the live
 * subscription rows; there are no local rows to fold in.
 */
export async function currentEntitlement(
  _userId: string,
  _now: Date = new Date(),
): Promise<Entitlement> {
  const profile = await api<SettingsProfileOut>(endpoints.user.profile);
  return {
    tier: isSubscriptionTier(profile.tier)
      ? (profile.tier as SubscriptionTier)
      : "FREEMIUM",
    expiresAt: profile.tierExpiresAt ? new Date(profile.tierExpiresAt) : null,
  };
}