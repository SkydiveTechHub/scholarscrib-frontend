import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isBillingEnabled } from "@/lib/features";
import { currentEntitlement } from "@/lib/billing/subscription-data";
import { TIER_DISPLAY_NAMES } from "@/lib/subscription";
import { PlanPicker } from "@/components/billing/plan-picker";
import { CancelPlanControls } from "@/components/billing/cancel-plan";
import { BillingReturnSettler } from "@/components/billing/billing-return";
import { StatusBanner } from "@/components/admin/status-banner";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Billing — ScholarsCrib",
};

// The page must reflect a charge that landed seconds ago, so it can never be
// served from a cache.
export const dynamic = "force-dynamic";

/** Outcomes shown after Paystack returns (or after `/api/billing/verify`). */
const NOTICES: Record<
  string,
  { tone: "success" | "error" | "info"; title: string }
> = {
  success: { tone: "success", title: "Payment received — your plan is active." },
  failed: {
    tone: "error",
    title: "That payment did not go through. Nothing was charged.",
  },
  // `pending` is deliberately absent: PlanPicker owns that state, because it
  // also has to close the buy buttons and poll until the charge settles.
  missing: { tone: "error", title: "We could not identify that payment." },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    reference?: string;
    trxref?: string;
  }>;
}) {
  const session = await getSessionUser();
  const userId = session?.id;
  if (!userId) redirect("/login");

  const params = await searchParams;
  const reference = params.reference || params.trxref;
  // Paystack lands with `reference` only; settle client-side into `?status=`.
  const status = params.status ?? (reference ? "pending" : undefined);
  const notice = status ? NOTICES[status] : undefined;
  const { tier, expiresAt, billingStatus } = await currentEntitlement(userId);

  return (
    <div className="animate-fade-in">
      {reference && !params.status ? (
        <BillingReturnSettler reference={reference} />
      ) : null}
      <PageHeader
        title="Billing"
        description="Choose the plan that fits how you study."
      />

      <div className="max-w-2xl space-y-5">
        {notice && <StatusBanner tone={notice.tone} title={notice.title} />}

        <p className="text-sm text-foreground">
          You are on <strong>{TIER_DISPLAY_NAMES[tier]}</strong>
          {billingStatus === "canceling" ? " (cancels at period end)" : ""}
          {expiresAt
            ? `, until ${expiresAt.toLocaleDateString("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}.`
            : "."}
        </p>
        <p className="text-sm text-muted">
          New accounts include one free month of Standard. Paid Standard
          (₦3,000) and Premium (₦10,000) renew monthly via Paystack. Update your
          card or change plans here anytime; failed renewals move you to Free
          after a short grace period.
        </p>

        <PlanPicker
          enabled={isBillingEnabled()}
          currentTier={tier}
          awaitingSettlement={status === "pending"}
        />

        <CancelPlanControls
          tier={tier}
          billingStatus={billingStatus}
          accessUntil={expiresAt}
        />

        <Link
          href="/settings"
          className="inline-block text-sm font-semibold text-muted hover:text-foreground"
        >
          ← Back to settings
        </Link>
      </div>
    </div>
  );
}
