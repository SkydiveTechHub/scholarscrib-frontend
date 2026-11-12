"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AdminWithdrawResolveIn,
  OkOut,
  TutorWalletWithdrawOut,
} from "@/lib/api/types";

function useInvalidateAdminCenters() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.admin.all, "centers"],
    });
}

export function useSetTutorActive() {
  const onSuccess = useInvalidateAdminCenters();
  return useMutation({
    mutationFn: ({
      tutorId,
      body,
    }: {
      tutorId: string;
      body: { isActive: true } | { isActive: false; reason: string };
    }) =>
      request<OkOut>({
        method: "POST",
        url: endpoints.admin.centers.tutorStatus(tutorId),
        data: body,
        realm: "admin",
      }),
    onSuccess,
  });
}

export function useVerifyTutor() {
  const onSuccess = useInvalidateAdminCenters();
  return useMutation({
    mutationFn: ({
      tutorId,
      body,
    }: {
      tutorId: string;
      body: { verified: boolean; note?: string };
    }) =>
      request<OkOut & { tutorVerifiedAt?: string | null }>({
        method: "POST",
        url: endpoints.admin.centers.tutorVerify(tutorId),
        data: body,
        realm: "admin",
      }),
    onSuccess,
  });
}

/** D11: fulfil (true) or reject (false) a wallet withdraw request. */
export function useResolveWithdrawRequest() {
  const onSuccess = useInvalidateAdminCenters();
  return useMutation({
    mutationFn: ({
      withdrawalId,
      body,
    }: {
      withdrawalId: string;
      body: AdminWithdrawResolveIn;
    }) =>
      request<TutorWalletWithdrawOut>({
        method: "POST",
        url: endpoints.admin.centers.withdrawalFulfil(withdrawalId),
        data: { fulfil: body.fulfil, note: body.note ?? null },
        realm: "admin",
      }),
    onSuccess,
  });
}
