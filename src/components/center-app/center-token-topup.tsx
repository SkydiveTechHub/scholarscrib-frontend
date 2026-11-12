"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBanner } from "@/components/admin/status-banner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  readTokenPacks,
  useCenterTokenCheckout,
  useCenterTokenPacks,
  useCenterTokenVerify,
} from "@/hooks/api/use-center-tokens";
import { isApiError } from "@/lib/api/errors";
import type { CenterTokenPackOut } from "@/lib/api/types";
import { amountLabel } from "@/lib/billing-plans";
import { isBillingEnabled } from "@/lib/features";
import { cn } from "@/lib/utils";

/** Matches BE `CENTER_TOKEN_PACKS` when the catalog route is briefly unavailable. */
const DEFAULT_PACKS: CenterTokenPackOut[] = [
  {
    code: "astra_pack_100",
    label: "100 tokens",
    tokens: 100,
    amountKobo: 100_000,
    currency: "NGN",
  },
  {
    code: "astra_pack_500",
    label: "500 tokens",
    tokens: 500,
    amountKobo: 400_000,
    currency: "NGN",
  },
  {
    code: "astra_pack_1500",
    label: "1,500 tokens",
    tokens: 1500,
    amountKobo: 1_000_000,
    currency: "NGN",
  },
];

/**
 * Owner-only AI token pack purchase. Paystack callback lands on
 * `/center/billing/tokens?centerId=…` then redirects here with `kind=tokens`.
 */
export function CenterTokenTopUp({
  centerId,
  settleReference,
  className,
}: {
  centerId: string;
  settleReference?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const packsQuery = useCenterTokenPacks(centerId);
  const checkout = useCenterTokenCheckout(centerId);
  const verify = useCenterTokenVerify(centerId);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settleStarted = useRef(false);
  const enabled = isBillingEnabled();

  const packs = readTokenPacks(packsQuery.data);
  const catalog = packs.length > 0 ? packs : DEFAULT_PACKS;

  useEffect(() => {
    if (!settleReference || settleStarted.current) return;
    settleStarted.current = true;
    let cancelled = false;
    (async () => {
      let status = "tokens_failed";
      try {
        const out = await verify.mutateAsync(settleReference);
        const outcome = (out.outcome ?? "").toLowerCase();
        if (
          outcome === "activate" ||
          outcome === "credited" ||
          outcome === "already-applied" ||
          outcome === "already_applied" ||
          outcome === "success" ||
          typeof out.pool?.balance === "number" ||
          typeof out.balance === "number"
        ) {
          status = "tokens_success";
        } else if (
          outcome === "not-successful" ||
          outcome === "not_successful" ||
          outcome === "failed"
        ) {
          status = "tokens_failed";
        }
      } catch {
        status = "pending";
      }
      if (cancelled) return;
      router.replace(`/center/billing?status=${status}`);
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [settleReference, verify, router]);

  async function buy(pack: CenterTokenPackOut) {
    if (!enabled || pack.purchasable === false) return;
    setBusyCode(pack.code);
    setError(null);
    try {
      const data = await checkout.mutateAsync({ packCode: pack.code });
      window.location.assign(data.authorizationUrl);
    } catch (err) {
      setError(
        isApiError(err) ? err.message : "Could not start checkout. Try again.",
      );
      setBusyCode(null);
    }
  }

  return (
    <section
      id="ai-tokens"
      className={cn("scroll-mt-24 space-y-4", className)}
    >
      <div>
        <h2 className="text-base font-bold text-foreground">AI tokens</h2>
        <p className="mt-1 text-sm text-muted">
          Tutor Astra draws from this center&apos;s token pool. Packs are one-off
          Paystack purchases — not part of Pro or Team.
        </p>
      </div>

      {error && <StatusBanner tone="error" title={error} />}

      {!enabled && (
        <StatusBanner
          tone="info"
          title="Payments are not available right now."
        />
      )}

      {packsQuery.isLoading && (
        <div className="flex justify-center py-8">
          <Spinner className="py-0" iconClassName="h-8 w-8" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {catalog.map((pack) => {
          const purchasable = pack.purchasable !== false && enabled;
          return (
            <div
              key={pack.code}
              className="flex flex-col rounded-xl border border-border bg-card p-4"
            >
              <p className="text-sm font-bold text-foreground">{pack.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {pack.tokens.toLocaleString()}
                <span className="ml-1 text-sm font-semibold text-muted">
                  tokens
                </span>
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {amountLabel(pack.amountKobo)}
              </p>
              <Button
                className="mt-4 w-full"
                variant="primary"
                disabled={!purchasable || busyCode !== null}
                onClick={() => void buy(pack)}
              >
                {busyCode === pack.code ? "Starting…" : "Buy pack"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
