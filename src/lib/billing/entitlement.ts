import type { SubscriptionTier } from "@/lib/subscription";

/** The tier the backend says the account holds right now. */
export type Entitlement = {
  tier: SubscriptionTier;
  /** When the granting tier lapses, or null when nothing is granted. */
  expiresAt: Date | null;
};
