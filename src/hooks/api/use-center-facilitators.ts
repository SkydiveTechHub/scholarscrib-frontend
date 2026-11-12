"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AcceptFacilitatorInviteOut,
  CenterFacilitatorsOut,
  FacilitatorInvitePreviewOut,
  InviteFacilitatorIn,
  InviteFacilitatorOut,
  OkOut,
  SessionOut,
} from "@/lib/api/types";

export function useTutorSessionUser(enabled = true) {
  return useQuery({
    queryKey: queryKeys.center.tutorSession(),
    queryFn: () =>
      request<SessionOut>({
        method: "GET",
        url: endpoints.centerApi.auth.session,
        realm: "tutor",
      }),
    select: (data) => data.user,
    enabled,
    staleTime: 60_000,
  });
}

export function useCenterFacilitators(centerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.center.facilitators(centerId ?? ""),
    queryFn: () =>
      request<CenterFacilitatorsOut>({
        method: "GET",
        url: endpoints.centerApi.facilitators.list(centerId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId),
    staleTime: 15_000,
  });
}

function useInvalidateFacilitators(centerId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.center.facilitators(centerId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.center.list() }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.center.billing(centerId),
      }),
    ]);
}

export function useInviteFacilitator(centerId: string) {
  const invalidate = useInvalidateFacilitators(centerId);
  return useMutation({
    mutationFn: (body: InviteFacilitatorIn = {}) =>
      request<InviteFacilitatorOut>({
        method: "POST",
        url: endpoints.centerApi.facilitators.invite(centerId),
        data: {
          email: body.email || undefined,
          expiresInDays: body.expiresInDays ?? 14,
        },
        realm: "tutor",
      }),
    onSuccess: invalidate,
  });
}

export function useRevokeFacilitatorMember(centerId: string) {
  const invalidate = useInvalidateFacilitators(centerId);
  return useMutation({
    mutationFn: (membershipId: string) =>
      request<OkOut>({
        method: "POST",
        url: endpoints.centerApi.facilitators.revokeMember(
          centerId,
          membershipId,
        ),
        realm: "tutor",
      }),
    onSuccess: invalidate,
  });
}

export function useRevokeFacilitatorInvite(centerId: string) {
  const invalidate = useInvalidateFacilitators(centerId);
  return useMutation({
    mutationFn: (inviteId: string) =>
      request<OkOut>({
        method: "POST",
        url: endpoints.centerApi.facilitators.revokeInvite(centerId, inviteId),
        realm: "tutor",
      }),
    onSuccess: invalidate,
  });
}

export function useFacilitatorInvitePreview(code: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.center.facilitatorInvite(code ?? ""),
    queryFn: () =>
      request<FacilitatorInvitePreviewOut>({
        method: "GET",
        url: endpoints.centerApi.facilitatorInvites.preview(code!),
        realm: "tutor",
        anonymous: true,
      }),
    enabled: Boolean(code),
    staleTime: 30_000,
    retry: false,
  });
}

export function useAcceptFacilitatorInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      request<AcceptFacilitatorInviteOut>({
        method: "POST",
        url: endpoints.centerApi.facilitatorInvites.accept(code),
        realm: "tutor",
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.center.list() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.center.all }),
      ]),
  });
}
