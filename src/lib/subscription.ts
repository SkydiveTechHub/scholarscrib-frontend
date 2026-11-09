/**
 * The subscription tier seam.
 *
 * The tier union mirrors the backend's `SubscriptionTier` enum. The backend
 * enforces entitlements; these rules decide what the UI shows or hides.
 */

export const SUBSCRIPTION_TIERS = ["FREEMIUM", "STANDARD", "PREMIUM"] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  FREEMIUM: "Freemium",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

/** Rank, not identity — comparisons must survive a tier being inserted later. */
const TIER_RANK: Record<SubscriptionTier, number> = {
  FREEMIUM: 0,
  STANDARD: 1,
  PREMIUM: 2,
};

const TIER_TONE: Record<SubscriptionTier, "neutral" | "info" | "success"> = {
  FREEMIUM: "neutral",
  STANDARD: "info",
  PREMIUM: "success",
};

export function isSubscriptionTier(
  value: string | undefined | null,
): value is SubscriptionTier {
  return (
    typeof value === "string" &&
    (SUBSCRIPTION_TIERS as readonly string[]).includes(value)
  );
}

export function hasAtLeast(
  account: { tier: SubscriptionTier },
  required: SubscriptionTier,
): boolean {
  return TIER_RANK[account.tier] >= TIER_RANK[required];
}

export function describeTier(account: { tier: SubscriptionTier }): {
  label: string;
  tone: "neutral" | "info" | "success";
} {
  return { label: TIER_LABELS[account.tier], tone: TIER_TONE[account.tier] };
}

export const BILLING_PERIODS = ["MONTHLY", "YEARLY"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  FREEMIUM: "Free",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

export const PERIOD_LABELS: Record<BillingPeriod, string> = {
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

/** Fallback prices (kobo). Live catalog comes from GET /api/billing/plans. */
const PLAN_PRICES_KOBO: Record<
  SubscriptionTier,
  Record<BillingPeriod, number>
> = {
  FREEMIUM: { MONTHLY: 0, YEARLY: 0 },
  STANDARD: { MONTHLY: 300_000, YEARLY: 300_000 },
  PREMIUM: { MONTHLY: 1_000_000, YEARLY: 1_000_000 },
};

export type Plan = {
  tier: SubscriptionTier;
  period: BillingPeriod;
  amountKobo: number;
  displayName: string;
};

export function planFor(tier: SubscriptionTier, period: BillingPeriod = "MONTHLY"): Plan {
  return {
    tier,
    period: "MONTHLY",
    amountKobo: PLAN_PRICES_KOBO[tier].MONTHLY,
    displayName: TIER_DISPLAY_NAMES[tier],
  };
}

export function formatNaira(kobo: number): string {
  return `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;
}

export const GATED_FEATURES = [
  "flashcards",
  "studyPlanner",
  "premiumLibrary",
  "advancedAnalytics",
  "aiTutor",
] as const;

export type GatedFeature = (typeof GATED_FEATURES)[number];

export const PAID_ENTITLEMENTS: Record<GatedFeature, SubscriptionTier> = {
  flashcards: "STANDARD",
  studyPlanner: "STANDARD",
  premiumLibrary: "PREMIUM",
  advancedAnalytics: "PREMIUM",
  // Tutor is on every plan; daily caps differ. Gate stays FREEMIUM so UI opens.
  aiTutor: "FREEMIUM",
};

/** Beta opens emptied — gates follow paid ranks. */
export const BETA_OPEN_FEATURES: readonly GatedFeature[] = [];

export const ENTITLEMENTS: Record<GatedFeature, SubscriptionTier> = {
  ...PAID_ENTITLEMENTS,
};

export function can(tier: SubscriptionTier, feature: GatedFeature): boolean {
  return hasAtLeast({ tier }, ENTITLEMENTS[feature]);
}

export function requiredTierFor(feature: GatedFeature): SubscriptionTier {
  return ENTITLEMENTS[feature];
}

export type PastQuestionsDetail = "answers" | "explanation" | "ai_explanation";

export function pastQuestionsDetail(tier: SubscriptionTier): PastQuestionsDetail {
  if (tier === "PREMIUM") return "ai_explanation";
  if (tier === "STANDARD") return "explanation";
  return "answers";
}

export function aiTutorDailyLimit(tier: SubscriptionTier): number {
  if (tier === "PREMIUM") return 60;
  if (tier === "STANDARD") return 20;
  return 2;
}

export const SUBSCRIPTION_STATUSES = [
  "PENDING",
  "ACTIVE",
  "FAILED",
  "ABANDONED",
  "REVOKED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_SOURCES = ["PAYSTACK", "COMP", "LAGO"] as const;
export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number];
