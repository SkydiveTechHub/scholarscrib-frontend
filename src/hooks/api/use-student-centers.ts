"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AcceptCenterInviteIn,
  AssignmentOut,
  OkOut,
  StartAssignmentOut,
  StudentAssignedListOut,
  StudentCenterMembershipOut,
} from "@/lib/api/types";
import {
  mapInvitePreview,
  mapStudentCentersMine,
} from "@/lib/center-student-mappers";

export function useMyCenters(enabled = true) {
  return useQuery({
    queryKey: queryKeys.centers.mine(),
    queryFn: async () => {
      const raw = await request<unknown>({
        method: "GET",
        url: endpoints.centers.mine,
      });
      return mapStudentCentersMine(raw);
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useInvitePreview(code: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.centers.invitePreview(code ?? ""),
    queryFn: async () => {
      const raw = await request<unknown>({
        method: "GET",
        url: endpoints.centers.invitePreview(code!),
        anonymous: true,
      });
      return mapInvitePreview(raw);
    },
    enabled: Boolean(code),
    staleTime: 60_000,
    retry: false,
  });
}

export function useJoinCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      code: string;
      body: AcceptCenterInviteIn;
    }) => {
      const res = await request<{
        membership?: StudentCenterMembershipOut;
        center?: { id: string; name: string };
        alreadyMember?: boolean;
      }>({
        method: "POST",
        url: endpoints.centers.inviteAccept(input.code),
        data: input.body,
      });
      return res;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.centers.mine() }),
  });
}

export function useLeaveCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (centerId: string) =>
      request<OkOut>({
        method: "POST",
        url: endpoints.centers.leave(centerId),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.centers.mine() }),
  });
}

export function useAssignedInbox(enabled = true) {
  return useQuery({
    queryKey: queryKeys.centers.assigned(),
    queryFn: () =>
      request<StudentAssignedListOut>({
        method: "GET",
        url: endpoints.centers.assigned,
      }),
    enabled,
    staleTime: 15_000,
  });
}

export function useAssignedAssignment(assignmentId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.centers.assignment(assignmentId ?? ""),
    queryFn: async () => {
      const res = await request<{ assignment: AssignmentOut }>({
        method: "GET",
        url: endpoints.centers.assignment(assignmentId!),
      });
      return res.assignment;
    },
    enabled: Boolean(assignmentId),
    staleTime: 10_000,
  });
}

export function useStartAssignedAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      request<StartAssignmentOut>({
        method: "POST",
        url: endpoints.centers.assignmentStart(assignmentId),
        data: {},
      }),
    onSuccess: (_data, assignmentId) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.centers.assigned(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.centers.assignment(assignmentId),
        }),
      ]),
  });
}
