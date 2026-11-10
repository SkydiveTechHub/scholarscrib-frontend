/**
 * Display helpers for GET /api/billing/plans.
 * When the catalog is empty or unreachable, fall back to the static matrix.
 */

import type { PublicBillingFeature, PublicBillingPlan } from "@/lib/api/types";
import {
  TIER_DISPLAY_NAMES,
  formatNaira,
  planFor,
  type SubscriptionTier,
  isSubscriptionTier,
} from "@/lib/subscription";

export type PricingCardPlan = {
  tier: SubscriptionTier;
  code: string;
  name: string;
  blurb: string;
  amountKobo: number;
  isPurchasable: boolean;
  rank: number;
  highlight: boolean;
  badge: string | null;
  features: string[];
  cta: string;
  href: string;
};

const FEATURE_ORDER = [
  "past_questions",
  "ai_tutor",
  "study_plan",
  "flashcards",
  "class_notes",
  "performance",
  "classroom_pdf",
] as const;

/** Static cards used until the backend catalog is seeded. */
export const FALLBACK_PRICING_PLANS: PricingCardPlan[] = [
  {
    tier: "FREEMIUM",
    code: "freemium",
    name: TIER_DISPLAY_NAMES.FREEMIUM,
    blurb: "To get started — first month includes Standard free",
    amountKobo: planFor("FREEMIUM").amountKobo,
    isPurchasable: false,
    rank: 0,
    highlight: false,
    badge: "1st month Standard free",
    features: [
      "Past questions with answers",
      "AI tutor — 2 requests / day",
      "Class notes",
      "Performance overview",
    ],
    cta: "Start free",
    href: "/register",
  },
  {
    tier: "STANDARD",
    code: "standard",
    name: TIER_DISPLAY_NAMES.STANDARD,
    blurb: "Explanations, study plan, and more tutor capacity",
    amountKobo: planFor("STANDARD").amountKobo,
    isPurchasable: true,
    rank: 1,
    highlight: false,
    badge: null,
    features: [
      "Everything in Free",
      "Past-question explanations",
      "AI tutor — 20 requests / day",
      "Study plan & flashcards",
      "Performance overview",
    ],
    cta: "Get Standard",
    href: "/register",
  },
  {
    tier: "PREMIUM",
    code: "premium",
    name: TIER_DISPLAY_NAMES.PREMIUM,
    blurb: "AI explanations, subject analytics, and classroom PDFs",
    amountKobo: planFor("PREMIUM").amountKobo,
    isPurchasable: true,
    rank: 2,
    highlight: true,
    badge: "Recommended",
    features: [
      "Everything in Standard",
      "AI explanations on past questions",
      "AI tutor — 60 requests / day",
      "Performance by subject",
      "Classroom PDFs & premium library",
    ],
    cta: "Get Premium",
    href: "/register",
  },
];

export function formatEntitlementLine(feature: PublicBillingFeature): string | null {
  if (!feature.enabled) return null;
  const value = feature.value;
  switch (feature.code) {
    case "past_questions":
      if (value === "ai_explanation") return "AI explanations on past questions";
      if (value === "explanation") return "Past-question explanations";
      return "Past questions with answers";
    case "performance":
      if (value === "by_subject") return "Performance by subject";
      return "Performance overview";
    case "ai_tutor": {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      return `AI tutor — ${n} requests / day`;
    }
    case "study_plan":
      return "Study plan";
    case "flashcards":
      return "Flashcards";
    case "class_notes":
      return "Class notes";
    case "classroom_pdf":
      return "Classroom PDFs & premium library";
    default: {
      if (value === false || value === 0 || value === "false") return null;
      if (typeof value === "boolean") return feature.code.replaceAll("_", " ");
      return `${feature.code.replaceAll("_", " ")}: ${String(value)}`;
    }
  }
}

function featureLines(features: PublicBillingFeature[]): string[] {
  const byCode = new Map(features.map((f) => [f.code, f]));
  const lines: string[] = [];
  const study = byCode.get("study_plan");
  const flash = byCode.get("flashcards");
  const studyOn = study ? formatEntitlementLine(study) : null;
  const flashOn = flash ? formatEntitlementLine(flash) : null;

  for (const code of FEATURE_ORDER) {
    if (code === "study_plan" || code === "flashcards") {
      if (code === "study_plan" && studyOn && flashOn) {
        lines.push("Study plan & flashcards");
      } else if (code === "study_plan" && studyOn && !flashOn) {
        lines.push(studyOn);
      } else if (code === "flashcards" && flashOn && !studyOn) {
        lines.push(flashOn);
      }
      continue;
    }
    const feature = byCode.get(code);
    if (!feature) continue;
    const line = formatEntitlementLine(feature);
    if (line) lines.push(line);
  }
  for (const feature of features) {
    if ((FEATURE_ORDER as readonly string[]).includes(feature.code)) continue;
    const line = formatEntitlementLine(feature);
    if (line) lines.push(line);
  }
  return lines;
}

function toCard(plan: PublicBillingPlan, highlight: boolean): PricingCardPlan | null {
  if (!isSubscriptionTier(plan.tier)) return null;
  const amountKobo = plan.amountKobo;
  const isFree = amountKobo <= 0 || !plan.isPurchasable;
  return {
    tier: plan.tier,
    code: plan.code,
    name: plan.displayName || TIER_DISPLAY_NAMES[plan.tier],
    blurb: plan.blurb?.trim() || "",
    amountKobo,
    isPurchasable: plan.isPurchasable,
    rank: plan.rank,
    highlight,
    badge:
      highlight
        ? "Recommended"
        : plan.tier === "FREEMIUM"
          ? "1st month Standard free"
          : null,
    features: featureLines(plan.features ?? []),
    cta: isFree
      ? "Start free"
      : `Get ${plan.displayName || TIER_DISPLAY_NAMES[plan.tier]}`,
    href: "/register",
  };
}

/** Prefer live catalog; fall back when empty or unusable. */
export function resolvePricingPlans(
  plans: PublicBillingPlan[] | undefined | null,
): PricingCardPlan[] {
  if (!plans?.length) return FALLBACK_PRICING_PLANS;

  const sorted = [...plans].sort((a, b) => a.rank - b.rank);
  const maxPurchasableRank = Math.max(
    0,
    ...sorted.filter((p) => p.isPurchasable).map((p) => p.rank),
  );
  const cards = sorted
    .map((plan) =>
      toCard(plan, plan.isPurchasable && plan.rank === maxPurchasableRank),
    )
    .filter((c): c is PricingCardPlan => c !== null);

  return cards.length > 0 ? cards : FALLBACK_PRICING_PLANS;
}

export function amountLabel(amountKobo: number): string {
  return amountKobo <= 0 ? "₦0" : formatNaira(amountKobo);
}
