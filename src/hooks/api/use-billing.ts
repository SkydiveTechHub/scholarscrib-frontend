"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { CheckoutOut, PublicBillingPlansOut } from "@/lib/api/types";
import { resolvePricingPlans } from "@/lib/billing-plans";
import type { BillingPeriod, SubscriptionTier } from "@/lib/subscription";

export type CancelBillingOut = {
  status: "canceling" | "freemium";
  accessUntil: string | null;
};

export type ResumeBillingOut = {
  status: "active";
  accessUntil: string | null;
};

/** Public catalog for landing / pricing / plan picker (anonymous). */
export function useBillingPlans() {
  const query = useQuery({
    queryKey: queryKeys.billing.plans(),
    queryFn: () =>
      request<PublicBillingPlansOut>({
        method: "GET",
        url: endpoints.billing.plans,
        anonymous: true,
      }),
    staleTime: 60_000,
  });

  return {
    ...query,
    /** Live catalog when populated; otherwise the static fallback matrix. */
    plans: resolvePricingPlans(query.data?.plans ?? null),
  };
}

export function useCheckout() {
  return useMutation({
    mutationFn: (input: { tier: SubscriptionTier; period: BillingPeriod }) =>
      request<CheckoutOut>({
        method: "POST",
        url: endpoints.billing.checkout,
        data: input,
      }),
  });
}

export function useCancelBilling() {
  return useMutation({
    mutationFn: () =>
      request<CancelBillingOut>({
        method: "POST",
        url: endpoints.billing.cancel,
      }),
  });
}

export function useResumeBilling() {
  return useMutation({
    mutationFn: () =>
      request<ResumeBillingOut>({
        method: "POST",
        url: endpoints.billing.resume,
      }),
  });
}
