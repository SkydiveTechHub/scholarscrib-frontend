"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  CenterTokenBalanceOut,
  CenterTokenCheckoutIn,
  CenterTokenCheckoutOut,
  CenterTokenPackOut,
  CenterTokenPacksOut,
  CenterTokenPool,
  CenterTokenVerifyOut,
} from "@/lib/api/types";

export function readTokenBalance(data: CenterTokenBalanceOut | undefined): number | null {
  if (!data) return null;
  if (typeof data.pool?.balance === "number") return data.pool.balance;
  if (typeof data.balance === "number") return data.balance;
  return null;
}

export function readTokenPool(
  data: CenterTokenBalanceOut | undefined,
): CenterTokenPool | null {
  if (!data) return null;
  if (data.pool && typeof data.pool.balance === "number") return data.pool;
  if (typeof data.balance === "number") {
    return { balance: data.balance };
  }
  return null;
}

export function readTokenPacks(
  data: CenterTokenBalanceOut | CenterTokenPacksOut | undefined,
): CenterTokenPackOut[] {
  return data?.packs ?? [];
}

export function useCenterTokenBalance(
  centerId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.center.tokens(centerId ?? ""),
    queryFn: () =>
      request<CenterTokenBalanceOut>({
        method: "GET",
        url: endpoints.centerApi.tokens.balance(centerId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId) && enabled,
    staleTime: 10_000,
  });
}

export function useCenterTokenPacks(
  centerId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.center.tokenPacks(centerId ?? ""),
    queryFn: async () => {
      // Prefer dedicated packs route; fall back to balance payload which
      // already embeds the catalog (GetCenterTokenPoolService).
      try {
        return await request<CenterTokenPacksOut>({
          method: "GET",
          url: endpoints.centerApi.tokens.packs(centerId!),
          realm: "tutor",
        });
      } catch {
        const balance = await request<CenterTokenBalanceOut>({
          method: "GET",
          url: endpoints.centerApi.tokens.balance(centerId!),
          realm: "tutor",
        });
        return { packs: balance.packs ?? [] };
      }
    },
    enabled: Boolean(centerId) && enabled,
    staleTime: 60_000,
  });
}

export function useCenterTokenCheckout(centerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CenterTokenCheckoutIn) =>
      request<CenterTokenCheckoutOut>({
        method: "POST",
        url: endpoints.centerApi.tokens.checkout(centerId),
        data: { packCode: body.packCode },
        realm: "tutor",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.center.tokens(centerId),
      }),
  });
}

export function useCenterTokenVerify(centerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) =>
      request<CenterTokenVerifyOut>({
        method: "POST",
        url: endpoints.centerApi.tokens.verify(centerId),
        data: { reference },
        realm: "tutor",
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.center.tokens(centerId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.center.tokenPacks(centerId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.center.billing(centerId),
        }),
      ]),
  });
}
