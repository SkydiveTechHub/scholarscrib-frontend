"use client";

import { useMutation } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import type { CheckoutOut } from "@/lib/api/types";
import type { BillingPeriod, SubscriptionTier } from "@/lib/subscription";

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
