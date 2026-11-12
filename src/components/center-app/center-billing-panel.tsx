"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CenterEmptyState } from "@/components/center-app/center-empty-state";
import { CenterBillingReturnSettler } from "@/components/center-app/center-billing-return";
import { CenterTokenBalance } from "@/components/center-app/center-token-balance";
import { CenterTokenTopUp } from "@/components/center-app/center-token-topup";
import { CenterWalletPanel } from "@/components/center-app/center-wallet-panel";
import { StatusBanner } from "@/components/admin/status-banner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useCenterBilling,
  useCenterCheckout,
} from "@/hooks/api/use-center-billing";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isApiError } from "@/lib/api/errors";
import { amountLabel } from "@/lib/billing-plans";
import { isBillingEnabled } from "@/lib/features";
import {
  CENTER_FREE_ACTIVE_STUDENT_LIMIT,
  CENTER_PLAN_LABELS,
  CENTER_PRO_MAX_FACILITATORS,
  CENTER_PRO_YEARLY_KOBO,
  CENTER_TEAM_MAX_FACILITATORS,
  CENTER_TEAM_YEARLY_KOBO,
  isCenterOwnerRole,
} from "@/lib/center-subjects";

const SETTLE_POLL_MS = 3_000;
const SETTLE_TIMEOUT_MS = 60_000;

export function CenterBillingPanel({
  awaitingSettlement = false,
  settleReference,
  tokenSettleReference,
  preferredCenterId,
}: {
  awaitingSettlement?: boolean;
  /** Paystack return reference — settled client-side once centerId is known. */
  settleReference?: string | null;
  /** Paystack return for AI token pack purchase (M6). */
  tokenSettleReference?: string | null;
  preferredCenterId?: string | null;
}) {
  const router = useRouter();
  const { centersQuery, centers, center: activeCenter } =
    useActiveCenter(preferredCenterId);
  // Billing is owner-only: prefer the active center when you own it, else
  // the first owned center (facilitators stay on a read-only empty state).
  const ownedCenter =
    (activeCenter && isCenterOwnerRole(activeCenter.staffRole)
      ? activeCenter
      : null) ??
    centers.find((c) => isCenterOwnerRole(c.staffRole)) ??
    null;
  const facilitatorOnly =
    !ownedCenter && centers.some((c) => !isCenterOwnerRole(c.staffRole));
  const center = ownedCenter;
  const centerId = center?.id ?? "";

  // Billing APIs are owner-only (T-9); skip the query for facilitators.
  const billingQuery = useCenterBilling(centerId || null, Boolean(centerId));
  const checkout = useCenterCheckout(centerId);

  const [busy, setBusy] = useState<"PRO" | "TEAM" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const planAtSettleStart = useRef<string | null>(null);

  const billing = billingQuery.data?.billing;
  const plan = (billing?.plan ?? center?.plan ?? "FREE").toUpperCase();
  const isTeam = plan === "TEAM";
  const isPro = plan === "PRO";
  const isPaid = isPro || isTeam;
  const activeCount =
    billing?.activeStudentCount ?? center?.activeStudentCount ?? 0;
  const freeLimit =
    billing?.freeStudentLimit ?? CENTER_FREE_ACTIVE_STUDENT_LIMIT;
  const proAmount = billing?.pro?.amountKobo ?? CENTER_PRO_YEARLY_KOBO;
  const teamAmount = billing?.team?.amountKobo ?? CENTER_TEAM_YEARLY_KOBO;
  const proPurchasable = billing?.pro?.purchasable ?? plan === "FREE";
  const teamPurchasable =
    billing?.team?.purchasable ?? (plan === "FREE" || plan === "PRO");
  const proMaxFacilitators =
    billing?.pro?.maxFacilitators ?? CENTER_PRO_MAX_FACILITATORS;
  const teamMaxFacilitators =
    billing?.team?.maxFacilitators ?? CENTER_TEAM_MAX_FACILITATORS;
  const maxFacilitators = isTeam
    ? teamMaxFacilitators
    : isPro
      ? proMaxFacilitators
      : teamMaxFacilitators;
  const paidUntil = billing?.planPaidUntil ?? null;
  const enabled = isBillingEnabled();

  useEffect(() => {
    if (!awaitingSettlement) return;
    if (planAtSettleStart.current === null) {
      planAtSettleStart.current = plan;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt >= SETTLE_TIMEOUT_MS) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      void billingQuery.refetch();
      router.refresh();
    }, SETTLE_POLL_MS);

    return () => clearInterval(timer);
  }, [awaitingSettlement, billingQuery, router, plan]);

  const settleBaseline = planAtSettleStart.current;
  const settledUp =
    awaitingSettlement &&
    settleBaseline !== null &&
    plan !== settleBaseline &&
    isPaid;
  const settling = awaitingSettlement && !gaveUp && !settledUp;

  async function upgrade(target: "PRO" | "TEAM") {
    if (!centerId) return;
    setBusy(target);
    setError(null);
    try {
      const data = await checkout.mutateAsync({ plan: target });
      window.location.assign(data.authorizationUrl);
    } catch (err) {
      setError(
        isApiError(err) ? err.message : "Could not start checkout. Try again.",
      );
      setBusy(null);
    }
  }

  if (centersQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (facilitatorOnly) {
    return (
      <CenterEmptyState
        title="Billing is owner-only"
        message="Facilitators cannot change the center plan. Ask the center owner if you need an upgrade."
      />
    );
  }

  if (!center) {
    return (
      <div className="space-y-4">
        <CenterEmptyState
          title="No center yet"
          message="Create your center first, then choose a plan."
        />
        <Link
          href="/center/onboarding"
          className={buttonClass("primary", "md", "w-full sm:w-auto")}
        >
          Set up your center
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      {settleReference && centerId ? (
        <CenterBillingReturnSettler
          centerId={centerId}
          reference={settleReference}
        />
      ) : null}

      {error && <StatusBanner tone="error" title={error} />}

      {settling && (
        <StatusBanner
          tone="info"
          title="Confirming your payment…"
          message="This page updates by itself once it clears. Please do not pay again."
        />
      )}

      {gaveUp && !settledUp && (
        <StatusBanner
          tone="info"
          title="Your payment is taking longer than usual to confirm."
          message="Nothing is lost — refresh this page in a few minutes. If it still has not cleared, contact support before paying again."
        />
      )}

      {billingQuery.isError && (
        <StatusBanner
          tone="info"
          title="Could not load live billing status."
          message="Showing what we know from your center profile. Try refreshing shortly."
        />
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-foreground">{center.name}</h2>
          <Badge variant={isPaid ? "green" : "amber"}>
            {CENTER_PLAN_LABELS[plan] ?? plan}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted">
          {isTeam
            ? paidUntil
              ? `Team is active until ${formatDate(paidUntil)}. Invite up to ${maxFacilitators} facilitators.`
              : `Team is active — invite up to ${maxFacilitators} facilitators.`
            : isPro
              ? paidUntil
                ? `Pro is active until ${formatDate(paidUntil)}. Invite up to ${maxFacilitators} facilitators.`
                : `Pro is active — unlimited students, up to ${maxFacilitators} facilitators.`
              : `Free (solo) allows fewer than ${freeLimit} active students (${activeCount} of ${freeLimit} seats used).`}
        </p>
        {isPaid && (
          <p className="mt-2 text-sm">
            <Link
              href="/center/team"
              className="font-semibold text-primary underline underline-offset-2"
            >
              Manage team
            </Link>
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <PlanCard
          name="Free"
          priceLabel="₦0"
          period="/year"
          blurb={`Solo owner — under ${freeLimit} active students.`}
          current={plan === "FREE"}
        />
        <PlanCard
          name="Pro"
          priceLabel={amountLabel(proAmount)}
          period="/year"
          blurb={`Unlimited students — up to ${proMaxFacilitators} facilitators.`}
          current={isPro}
          highlight={plan === "FREE" && proPurchasable}
          action={
            !enabled ? (
              <StatusBanner
                tone="info"
                title="Payments are not available right now."
                className="mt-4"
              />
            ) : isPro ? (
              <Button className="mt-4 w-full" variant="outline" disabled>
                Your plan
              </Button>
            ) : isTeam ? (
              <Button className="mt-4 w-full" variant="outline" disabled>
                Included in Team
              </Button>
            ) : proPurchasable ? (
              <Button
                className="mt-4 w-full"
                variant="primary"
                onClick={() => upgrade("PRO")}
                disabled={busy !== null || settling}
              >
                {busy === "PRO" ? "Starting…" : "Upgrade to Pro"}
              </Button>
            ) : null
          }
        />
        <PlanCard
          name="Team"
          priceLabel={amountLabel(teamAmount)}
          period="/year"
          blurb={`Unlimited students — up to ${teamMaxFacilitators} facilitators.`}
          current={isTeam}
          highlight={!isTeam && teamPurchasable}
          action={
            !enabled ? (
              <StatusBanner
                tone="info"
                title="Payments are not available right now."
                className="mt-4"
              />
            ) : isTeam ? (
              <Button className="mt-4 w-full" variant="outline" disabled>
                Your plan
              </Button>
            ) : teamPurchasable ? (
              <Button
                className="mt-4 w-full"
                variant="primary"
                onClick={() => upgrade("TEAM")}
                disabled={busy !== null || settling}
              >
                {busy === "TEAM"
                  ? "Starting…"
                  : isPro
                    ? "Upgrade to Team"
                    : "Get Team"}
              </Button>
            ) : null
          }
        />
      </div>

      <p className="text-sm text-muted">
        Plans are billed yearly via Paystack. Referral earnings sit in your
        wallet below — spend on AI tokens or request a withdrawal.
      </p>

      <section className="rounded-xl border border-border bg-card p-5">
        <CenterTokenBalance centerId={centerId} canTopUp />
        <p className="mt-2 text-sm text-muted">
          Astra uses this pool. Facilitators draw from the same balance.
        </p>
      </section>

      <CenterTokenTopUp
        centerId={centerId}
        settleReference={tokenSettleReference}
      />

      <CenterWalletPanel centerId={centerId} />
    </div>
  );
}

function PlanCard({
  name,
  priceLabel,
  period,
  blurb,
  current,
  highlight,
  action,
}: {
  name: string;
  priceLabel: string;
  period: string;
  blurb: string;
  current?: boolean;
  highlight?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-primary/40 bg-card p-5 shadow-sm"
          : "rounded-xl border border-border bg-card p-5"
      }
    >
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-foreground">{name}</h3>
        {current && (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
            Current
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{blurb}</p>
      <p className="mt-2 text-2xl font-extrabold text-foreground">
        {priceLabel}
        <span className="ml-1 text-sm font-medium text-muted">{period}</span>
      </p>
      {action}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
