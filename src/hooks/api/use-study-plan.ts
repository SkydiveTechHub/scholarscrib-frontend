"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";

type PlanItemStatus = "COMPLETED" | "SKIPPED" | "PENDING";
type Position = { subjectId: string; topicId: string | null };

function useInvalidateStudyPlan() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.studyPlan.all });
}

/**
 * Creates the plan when there is no `planId` yet, otherwise updates that plan
 * (`PATCH /api/study-plan/{id}`, id from the `plan` object of the GET response).
 */
export function useSaveStudyPlan() {
  const invalidate = useInvalidateStudyPlan();
  return useMutation({
    mutationFn: ({ settings, planId }: { settings: unknown; planId?: string | null }) =>
      request<unknown>(
        planId
          ? { method: "PATCH", url: endpoints.studyPlan.detail(planId), data: settings }
          : { method: "POST", url: endpoints.studyPlan.root, data: settings },
      ),
    onSuccess: invalidate,
  });
}

/** `DELETE /api/study-plan/{id}` */
export function useDeleteStudyPlan() {
  const invalidate = useInvalidateStudyPlan();
  return useMutation({
    mutationFn: (planId: string) =>
      request<unknown>({
        method: "DELETE",
        url: endpoints.studyPlan.detail(planId),
      }),
    onSuccess: invalidate,
  });
}

export function useSetStudyPlanItemStatus() {
  const invalidate = useInvalidateStudyPlan();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PlanItemStatus }) =>
      request<unknown>({
        method: "PATCH",
        url: endpoints.studyPlan.item(id),
        data: { status },
      }),
    onSuccess: invalidate,
  });
}

export function useSaveStudyPlanPositions() {
  const invalidate = useInvalidateStudyPlan();
  return useMutation({
    mutationFn: (positions: Position[]) =>
      request<unknown>({
        method: "PUT",
        url: endpoints.studyPlan.positions,
        data: { positions },
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteStudyPlan() {
  const invalidate = useInvalidateStudyPlan();
  return useMutation({
    mutationFn: () =>
      request<unknown>({ method: "DELETE", url: endpoints.studyPlan.root }),
    onSuccess: invalidate,
  });
}
