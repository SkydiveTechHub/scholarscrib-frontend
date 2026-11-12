"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  TutorWalletSpendOut,
  TutorWalletStatusOut,
  TutorWalletWithdrawIn,
  TutorWalletWithdrawOut,
} from "@/lib/api/types";

export function readWalletBalance(
  data: TutorWalletStatusOut | undefined,
): number | null {
  if (!data?.wallet) return null;
  if (typeof data.wallet.balanceKobo === "number") return data.wallet.balanceKobo;
  return null;
}

export function useCenterWallet(enabled = true) {
  return useQuery({
    queryKey: queryKeys.center.wallet(),
    queryFn: () =>
      request<TutorWalletStatusOut>({
        method: "GET",
        url: endpoints.centerApi.wallet.status,
        realm: "tutor",
      }),
    enabled,
    staleTime: 15_000,
  });
}

function invalidateWallet(
  queryClient: ReturnType<typeof useQueryClient>,
  centerId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.center.wallet(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.center.tokens(centerId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.center.billing(centerId),
    }),
  ]);
}

export function useCenterWalletSpend(centerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (packCode: string) =>
      request<TutorWalletSpendOut>({
        method: "POST",
        url: endpoints.centerApi.wallet.spendTokens(centerId),
        data: { packCode },
        realm: "tutor",
      }),
    onSuccess: () => invalidateWallet(queryClient, centerId),
  });
}

export function useCenterWalletWithdraw(centerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TutorWalletWithdrawIn) =>
      request<TutorWalletWithdrawOut>({
        method: "POST",
        url: endpoints.centerApi.wallet.withdraw,
        data: {
          amountKobo: body.amountKobo,
          payoutDetails: body.payoutDetails,
          note: body.note ?? null,
        },
        realm: "tutor",
      }),
    onSuccess: () => invalidateWallet(queryClient, centerId),
  });
}
