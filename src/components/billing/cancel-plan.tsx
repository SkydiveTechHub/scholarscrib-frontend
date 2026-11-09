"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/admin/status-banner";
import { isApiError } from "@/lib/api/errors";
import { useCancelBilling, useResumeBilling } from "@/hooks/api/use-billing";
import type { SubscriptionTier } from "@/lib/subscription";

export function CancelPlanControls({
  tier,
  billingStatus,
  accessUntil,
}: {
  tier: SubscriptionTier;
  billingStatus: string | null | undefined;
  accessUntil: Date | null;
}) {
  const router = useRouter();
  const cancel = useCancelBilling();
  const resume = useResumeBilling();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = pending || cancel.isPending || resume.isPending;

  const canceling = billingStatus === "canceling";
  const canCancel =
    !canceling &&
    (billingStatus === "active" ||
      billingStatus === "past_due" ||
      billingStatus === "trialing" ||
      (tier !== "FREEMIUM" && billingStatus !== "freemium"));

  if (!canCancel && !canceling) return null;

  async function run(action: "cancel" | "resume") {
    setError(null);
    try {
      if (action === "cancel") await cancel.mutateAsync();
      else await resume.mutateAsync();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(isApiError(e) ? e.message : "Could not update your plan.");
    }
  }

  const untilLabel = accessUntil
    ? accessUntil.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      {error && <StatusBanner tone="error" title={error} />}
      {canceling ? (
        <>
          <p className="text-sm text-foreground">
            Cancellation scheduled
            {untilLabel ? (
              <>
                . You keep this plan until <strong>{untilLabel}</strong>, then
                move to Free.
              </>
            ) : (
              "."
            )}
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void run("resume")}
          >
            {busy ? "Working…" : "Keep my plan"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            {billingStatus === "trialing"
              ? "End the free Standard month early and switch to Free now."
              : "Cancel renewals. You keep paid access until the end of the current month."}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void run("cancel")}
          >
            {busy ? "Working…" : "Cancel plan"}
          </Button>
        </>
      )}
    </div>
  );
}
