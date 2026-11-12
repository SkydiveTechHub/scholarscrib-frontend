/** Common subjects tutorial centers offer — used in onboarding chips. */
export const CENTER_SUBJECT_OPTIONS = [
  "English Language",
  "Mathematics",
  "Further Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Agricultural Science",
  "Economics",
  "Government",
  "Literature in English",
  "Geography",
  "Accounting",
  "Commerce",
  "CRS",
  "IRS",
  "Civic Education",
  "Computer Studies",
] as const;

/**
 * Levels a center can serve (PRD: SS1–SS3 + resitters).
 * `value` is what the API stores; `label` is UI copy.
 */
export const CENTER_LEVEL_OPTIONS = [
  { value: "SS1", label: "SS1" },
  { value: "SS2", label: "SS2" },
  { value: "SS3", label: "SS3" },
  { value: "POST_SS3", label: "Post-SS3 / Resit" },
] as const;

export type CenterLevelValue = (typeof CENTER_LEVEL_OPTIONS)[number]["value"];

export function centerLevelLabel(value: string): string {
  const hit = CENTER_LEVEL_OPTIONS.find((o) => o.value === value);
  return hit?.label ?? value;
}

/** Free plan active-student cap (PRD R-10 / domain CENTER_FREE_ACTIVE_STUDENT_LIMIT). */
export const CENTER_FREE_ACTIVE_STUDENT_LIMIT = 5;

/** Pro yearly price in kobo (CENTER_PRO_YEARLY_KOBO). */
export const CENTER_PRO_YEARLY_KOBO = 1_000_000;

/** Team yearly price in kobo (PRD D1 / domain CENTER_TEAM_YEARLY_KOBO). */
export const CENTER_TEAM_YEARLY_KOBO = 1_500_000;

/** Facilitator seats on Pro. */
export const CENTER_PRO_MAX_FACILITATORS = 3;

/** Facilitator seats on Team. */
export const CENTER_TEAM_MAX_FACILITATORS = 5;

/** @deprecated Prefer plan-specific caps; equals Team max. */
export const CENTER_MAX_FACILITATORS = CENTER_TEAM_MAX_FACILITATORS;

/** Minimum withdraw request (PRD D11 / domain CENTER_WALLET_MIN_WITHDRAW_KOBO). */
export const CENTER_WALLET_MIN_WITHDRAW_KOBO = 100_000;

/** Referral commission rate shown in UI (PRD §10.2 / REFERRAL_COMMISSION_BPS). */
export const REFERRAL_COMMISSION_PERCENT = 5;

export const CENTER_PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  PRO: "Pro",
  TEAM: "Team",
};

export function centerMaxFacilitators(plan?: string | null): number {
  const code = (plan || "FREE").toUpperCase();
  if (code === "TEAM") return CENTER_TEAM_MAX_FACILITATORS;
  if (code === "PRO") return CENTER_PRO_MAX_FACILITATORS;
  return 0;
}

export function centerAllowsFacilitators(plan?: string | null): boolean {
  return centerMaxFacilitators(plan) > 0;
}

export function isCenterOwnerRole(staffRole?: string | null): boolean {
  return (staffRole ?? "").toLowerCase() === "owner";
}

export function isCenterFacilitatorRole(staffRole?: string | null): boolean {
  return (staffRole ?? "").toLowerCase() === "facilitator";
}
