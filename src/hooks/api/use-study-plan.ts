"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { PlanSettings } from "@/lib/study-plan-settings";
import { parsePreview, type PlanPreview } from "@/lib/study-timetable";

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
    mutationFn: ({ settings, planId }: { settings: PlanSettings; planId?: string | null }) =>
      request<unknown>(
        planId
          ? { method: "PATCH", url: endpoints.studyPlan.detail(planId), data: settings }
          : { method: "POST", url: endpoints.studyPlan.root, data: settings },
      ),
    onSuccess: invalidate,
  });
}

/**
 * `POST /api/study-plan/preview`: validates the settings and shows the first two
 * weeks they would give. It saves nothing, so it never refreshes the plan.
 */
export function usePreviewStudyPlan() {
  return useMutation({
    mutationFn: async (settings: PlanSettings): Promise<PlanPreview> =>
      parsePreview(
        await request<unknown>({ method: "POST", url: endpoints.studyPlan.preview, data: settings }),
      ),
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

