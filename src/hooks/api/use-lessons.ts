"use client";

import { useMutation } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";

export type LessonProgressInput = {
  status: string;
  completionPercent: number;
  checkpointData: unknown;
};

/** Fire-and-forget checkpoint save; callers use `mutate`, which never throws. */
export function useSaveLessonProgress() {
  return useMutation({
    mutationFn: ({ lessonId, ...body }: LessonProgressInput & { lessonId: string }) =>
      request<unknown>({
        method: "PATCH",
        url: endpoints.lessons.progress(lessonId),
        data: body,
      }),
  });
}
