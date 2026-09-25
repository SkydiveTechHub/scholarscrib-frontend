/**
 * Reading the caller's tier and enforcing the entitlement matrix.
 *
 * The matrix itself lives in `@/lib/subscription`, which stays database-free
 * and unit-tested. This module turns a tier into a decision — the backend owns
 * the account record and its `tier` column, so the only tier that reaches
 * these helpers is the one the backend returned (a session claim or a profile
 * read). There is no local database to double-check.
 */

import { NextResponse } from "next/server";
import {
  can,
  isSubscriptionTier,
  requiredTierFor,
  TIER_DISPLAY_NAMES,
  type GatedFeature,
  type SubscriptionTier,
} from "@/lib/subscription";

/**
 * Anyone whose tier cannot be determined is FREEMIUM. Failing closed is the
 * only safe default for a paywall: a missing claim must never read as "grant
 * everything".
 */
export function tierOf(value: unknown): SubscriptionTier {
  return isSubscriptionTier(value as string)
    ? (value as SubscriptionTier)
    : "FREEMIUM";
}

/** The tier carried on a session object, for callers that already have one. */
export function tierOfSession(
  session: { user?: unknown } | null | undefined,
): SubscriptionTier {
  return tierOf((session?.user as { tier?: unknown } | undefined)?.tier);
}

/**
 * Whether this tier may use a feature. The old loader re-checked the local
 * `User.tier` column on a denial because the session cache could lag a fresh
 * upgrade; now the backend answers every request, so the tier it returned is
 * authoritative and there is nothing left to re-read. A student whose plan
 * changed re-fetches a fresh tier on their next request.
 */
export function isEntitled(
  _userId: string,
  cachedTier: SubscriptionTier,
  feature: GatedFeature,
): boolean {
  return can(cachedTier, feature);
}

/**
 * 403 rather than 402: the request is understood and the account is real, it
 * simply is not entitled. The body carries what the client needs to prompt an
 * upgrade without hardcoding the matrix on the client.
 */
export function entitlementDenial(feature: GatedFeature): NextResponse {
  const required = requiredTierFor(feature);
  return NextResponse.json(
    {
      error: `This feature is part of ${TIER_DISPLAY_NAMES[required]}.`,
      requiredTier: required,
      feature,
    },
    { status: 403 },
  );
}

/**
 * The gate for route handlers holding a session. Returns a response to send
 * back, or null when the caller is entitled and the handler should carry on.
 *
 *   const denied = await denyUnlessEntitled(session, "flashcards");
 *   if (denied) return denied;
 */
export async function denyUnlessEntitled(
  session: { user?: unknown } | null | undefined,
  feature: GatedFeature,
): Promise<NextResponse | null> {
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return isEntitled(userId, tierOfSession(session), feature)
    ? null
    : entitlementDenial(feature);
}