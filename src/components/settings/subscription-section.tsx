import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { currentEntitlement } from "@/lib/billing/subscription-data";
import { TIER_DISPLAY_NAMES } from "@/lib/subscription";

/**
 * A one-line plan status with the way into the buying flow (the full plan
 * picker lives at /settings/billing). It reads the entitlement rows rather
 * than the cached `User.tier` column so a plan that lapsed since the session
 * token was minted shows as lapsed here.
 *
 * Deliberately a slim row, not a card: most visits to Settings are to fix a
 * name or a class, and an upsell should not outweigh that.
 */
export async function SubscriptionSection({ userId }: { userId: string }) {
  const { tier, expiresAt } = await currentEntitlement(userId);
  const onTopTier = tier === "PREMIUM";

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-foreground">Your plan</span>
        <Badge variant={onTopTier ? "primary" : "neutral"}>{TIER_DISPLAY_NAMES[tier]}</Badge>
        {expiresAt && (
          <span className="text-sm text-muted">
            Until{" "}
            {expiresAt.toLocaleDateString("en-NG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      <Link
        href="/settings/billing"
        className={buttonClass(onTopTier ? "ghost" : "outline", "sm")}
      >
        {onTopTier ? "Manage plan" : "Upgrade plan"}
      </Link>
    </div>
  );
}
