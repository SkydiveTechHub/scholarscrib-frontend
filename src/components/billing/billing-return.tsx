"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";

type VerifyOut = { status: "success" | "failed" | "pending" | "missing" };

/**
 * Paystack returns here with `?reference=` (and often `trxref=`). Settle via
 * the API, then replace the URL with a clean `?status=` the page already
 * understands.
 */
export function BillingReturnSettler({ reference }: { reference: string }) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      let status: VerifyOut["status"] = "pending";
      try {
        const out = await request<VerifyOut>({
          method: "GET",
          url: endpoints.billing.verify,
          params: { reference },
        });
        status = out.status;
      } catch {
        status = "pending";
      }
      if (cancelled) return;
      router.replace(`/settings/billing?status=${status}`);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [reference, router]);

  return null;
}
