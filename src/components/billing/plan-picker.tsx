"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/admin/status-banner";
import { isApiError } from "@/lib/api/errors";
import { useBillingPlans, useCheckout } from "@/hooks/api/use-billing";
import { amountLabel } from "@/lib/billing-plans";
import type { SubscriptionTier } from "@/lib/subscription";

/** How long to keep re-checking before giving up and telling the buyer to wait. */
const SETTLE_POLL_MS = 3_000;
const SETTLE_TIMEOUT_MS = 60_000;

export function PlanPicker({
  enabled,
  currentTier,
  awaitingSettlement = false,
}: {
  enabled: boolean;
  currentTier: SubscriptionTier;
  /** True on the `?status=pending` return, when a charge is still settling. */
  awaitingSettlement?: boolean;
}) {
  const router = useRouter();
  const checkout = useCheckout();
  const { plans } = useBillingPlans();
  const [busy, setBusy] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  const buyable = useMemo(
    () => plans.filter((p) => p.isPurchasable && p.amountKobo > 0),
    [plans],
  );

  useEffect(() => {
    if (!awaitingSettlement) return;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt >= SETTLE_TIMEOUT_MS) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, SETTLE_POLL_MS);

    return () => clearInterval(timer);
  }, [awaitingSettlement, router]);

  async function buy(tier: SubscriptionTier) {
    setBusy(tier);
    setError(null);
    try {
      const data = await checkout.mutateAsync({ tier, period: "MONTHLY" });
      window.location.assign(data.authorizationUrl);
    } catch (error) {
      setError(isApiError(error) ? error.message : "Could not reach the server");
      setBusy(null);
    }
  }

  if (!enabled) {
    return (
      <StatusBanner
        tone="info"
        title="Payments are not available right now. Please check back shortly."
      />
    );
  }

  const settling = awaitingSettlement && !gaveUp;

  return (
    <div>
      {error && <StatusBanner tone="error" title={error} className="mb-4" />}

      {settling && (
        <StatusBanner
          tone="info"
          title="Confirming your payment…"
          message="This page updates by itself once it clears. Please do not pay again."
          className="mb-4"
        />
      )}

      {gaveUp && (
        <StatusBanner
          tone="info"
          title="Your payment is taking longer than usual to confirm."
          message="Nothing is lost — refresh this page in a few minutes. If it still has not cleared, contact support before paying again."
          className="mb-4"
        />
      )}

      <p className="mt-2 text-sm text-muted">
        Monthly plans renew automatically via Paystack. One student per account.
        Manage or cancel anytime here.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {buyable.map((plan) => {
          const isCurrent = plan.tier === currentTier;

          return (
            <div key={plan.code} className="card p-5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
                    Current plan
                  </span>
                )}
              </div>

              {plan.blurb ? (
                <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
              ) : null}

              <p className="mt-1 text-2xl font-extrabold text-foreground">
                {amountLabel(plan.amountKobo)}
                <span className="ml-1 text-sm font-medium text-muted">/month</span>
              </p>

              <Button
                className="mt-4 w-full"
                variant={isCurrent ? "outline" : "primary"}
                onClick={() => buy(plan.tier)}
                disabled={isCurrent || settling || busy !== null}
              >
                {isCurrent
                  ? "Your plan"
                  : busy === plan.tier
                    ? "Starting…"
                    : `Get ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
