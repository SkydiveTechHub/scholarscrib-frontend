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

/** Creates the plan when there is none yet, otherwise updates its settings. */
export function useSaveStudyPlan() {
  const invalidate = useInvalidateStudyPlan();
  return useMutation({
    mutationFn: ({ settings, exists }: { settings: unknown; exists: boolean }) =>
      request<unknown>({
        method: exists ? "PATCH" : "POST",
        url: endpoints.studyPlan.root,
        data: settings,
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
