"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";

export type PlanPatchInput = {
  code: string;
  amountKobo?: number;
  displayName?: string;
  blurb?: string | null;
  isPurchasable?: boolean;
  active?: boolean;
  rank?: number;
};

export type EntitlementPatchInput = {
  planCode: string;
  featureCode: string;
  enabled?: boolean;
  privilegeValue?: unknown;
};

export type FeatureCreateInput = {
  code: string;
  name: string;
  valueType: "boolean" | "integer" | "select";
  selectOptions?: string[] | null;
  gateKey?: string | null;
  description?: string | null;
};

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.admin.billingCatalog(),
  });
}

export function usePatchBillingPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, ...data }: PlanPatchInput) =>
      request({
        method: "PATCH",
        url: endpoints.admin.billing.plan(code),
        data,
        realm: "admin",
      }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function usePatchBillingEntitlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planCode, featureCode, ...data }: EntitlementPatchInput) =>
      request({
        method: "PATCH",
        url: endpoints.admin.billing.entitlement(planCode, featureCode),
        data,
        realm: "admin",
      }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useCreateBillingFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FeatureCreateInput) =>
      request({
        method: "POST",
        url: endpoints.admin.billing.features,
        data,
        realm: "admin",
      }),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useSeedBillingCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      request({
        method: "POST",
        url: endpoints.admin.billing.seed,
        realm: "admin",
      }),
    onSuccess: () => invalidate(queryClient),
  });
}
