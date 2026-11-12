"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import type { CenterBillingVerifyOut } from "@/lib/api/types";

function statusFromOutcome(outcome: string | null | undefined): string {
  switch ((outcome ?? "").toLowerCase()) {
    case "activate":
    case "already-applied":
    case "already_applied":
      return "success";
    case "not-successful":
    case "not_successful":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Paystack returns to `/center/billing` with `?reference=`. Settle via
 * POST .../billing/verify, then replace with a clean `?status=`.
 */
export function CenterBillingReturnSettler({
  centerId,
  reference,
}: {
  centerId: string;
  reference: string;
}) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !centerId) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      let status = "pending";
      try {
        const out = await request<CenterBillingVerifyOut>({
          method: "POST",
          url: endpoints.centerApi.billing.verify(centerId),
          data: { reference },
          realm: "tutor",
        });
        status = statusFromOutcome(out.outcome);
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
  }, [centerId, reference, router]);

  return null;
}
