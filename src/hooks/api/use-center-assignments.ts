"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AssignmentEnvelopeOut,
  AssignmentOut,
  AssignmentsListOut,
  CreateAssignmentIn,
  ExtendAssignmentIn,
  GenerateAssignmentIn,
  GenerateAssignmentOut,
  UpdateAssignmentIn,
} from "@/lib/api/types";

function useInvalidateAssignments(centerId?: string, assignmentId?: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      ...(centerId
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.center.assignments(centerId),
            }),
          ]
        : []),
      ...(assignmentId
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.center.assignment(assignmentId),
            }),
          ]
        : []),
    ]);
}

export function useCenterAssignments(centerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.center.assignments(centerId ?? ""),
    queryFn: () =>
      request<AssignmentsListOut>({
        method: "GET",
        url: endpoints.centerApi.assignments.list(centerId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId),
    staleTime: 15_000,
  });
}

export function useCenterAssignment(
  centerId: string | null | undefined,
  assignmentId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.center.assignment(assignmentId ?? ""),
    queryFn: async () => {
      const res = await request<AssignmentEnvelopeOut>({
        method: "GET",
        url: endpoints.centerApi.assignments.detail(centerId!, assignmentId!),
        realm: "tutor",
      });
      return res.assignment;
    },
    enabled: Boolean(centerId && assignmentId),
    staleTime: 10_000,
  });
}

export function useCreateAssignment(centerId: string) {
  const invalidate = useInvalidateAssignments(centerId);
  return useMutation({
    mutationFn: async (body: CreateAssignmentIn) => {
      const res = await request<AssignmentEnvelopeOut>({
        method: "POST",
        url: endpoints.centerApi.assignments.create(centerId),
        data: body,
        realm: "tutor",
      });
      return res.assignment;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateAssignment(centerId: string, assignmentId: string) {
  const invalidate = useInvalidateAssignments(centerId, assignmentId);
  return useMutation({
    mutationFn: async (body: UpdateAssignmentIn) => {
      const res = await request<AssignmentEnvelopeOut>({
        method: "PATCH",
        url: endpoints.centerApi.assignments.detail(centerId, assignmentId),
        data: body,
        realm: "tutor",
      });
      return res.assignment;
    },
    onSuccess: invalidate,
  });
}

export function useGenerateAssignment(centerId: string, assignmentId: string) {
  const invalidate = useInvalidateAssignments(centerId, assignmentId);
  return useMutation({
    mutationFn: (body?: GenerateAssignmentIn) =>
      request<GenerateAssignmentOut>({
        method: "POST",
        url: endpoints.centerApi.assignments.generate(centerId, assignmentId),
        data: body ?? {},
        realm: "tutor",
      }),
    onSuccess: invalidate,
  });
}

export function usePublishAssignment(centerId: string, assignmentId: string) {
  const invalidate = useInvalidateAssignments(centerId, assignmentId);
  return useMutation({
    mutationFn: async () => {
      const res = await request<AssignmentEnvelopeOut>({
        method: "POST",
        url: endpoints.centerApi.assignments.publish(centerId, assignmentId),
        data: {},
        realm: "tutor",
      });
      return res.assignment;
    },
    onSuccess: invalidate,
  });
}

export function useCloseAssignment(centerId: string, assignmentId: string) {
  const invalidate = useInvalidateAssignments(centerId, assignmentId);
  return useMutation({
    mutationFn: async () => {
      const res = await request<AssignmentEnvelopeOut>({
        method: "POST",
        url: endpoints.centerApi.assignments.close(centerId, assignmentId),
        data: {},
        realm: "tutor",
      });
      return res.assignment;
    },
    onSuccess: invalidate,
  });
}

export function useExtendAssignment(centerId: string, assignmentId: string) {
  const invalidate = useInvalidateAssignments(centerId, assignmentId);
  return useMutation({
    mutationFn: async (body: ExtendAssignmentIn) => {
      const res = await request<AssignmentEnvelopeOut>({
        method: "POST",
        url: endpoints.centerApi.assignments.extend(centerId, assignmentId),
        data: body,
        realm: "tutor",
      });
      return res.assignment;
    },
    onSuccess: invalidate,
  });
}

export function useDuplicateAssignment(centerId: string) {
  const invalidate = useInvalidateAssignments(centerId);
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await request<AssignmentEnvelopeOut>({
        method: "POST",
        url: endpoints.centerApi.assignments.duplicate(centerId, assignmentId),
        data: {},
        realm: "tutor",
      });
      return res.assignment;
    },
    onSuccess: invalidate,
  });
}

/** @deprecated Prefer reading AssignmentOut from list/detail. */
export type { AssignmentOut };
