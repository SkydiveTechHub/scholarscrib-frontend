"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  CenterBillingOut,
  CenterBillingVerifyOut,
  CenterCheckoutIn,
  CheckoutOut,
} from "@/lib/api/types";

export function useCenterBilling(
  centerId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.center.billing(centerId ?? ""),
    queryFn: () =>
      request<CenterBillingOut>({
        method: "GET",
        url: endpoints.centerApi.billing.status(centerId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId) && enabled,
    staleTime: 15_000,
  });
}

export function useCenterCheckout(centerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CenterCheckoutIn = { plan: "PRO" }) =>
      request<CheckoutOut & { reference?: string }>({
        method: "POST",
        url: endpoints.centerApi.billing.checkout(centerId),
        data: { plan: body.plan ?? "PRO" },
        realm: "tutor",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.center.billing(centerId),
      }),
  });
}

export function useCenterBillingVerify(centerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) =>
      request<CenterBillingVerifyOut>({
        method: "POST",
        url: endpoints.centerApi.billing.verify(centerId),
        data: { reference },
        realm: "tutor",
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.center.billing(centerId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.center.list() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.center.detail(centerId),
        }),
      ]),
  });
}
