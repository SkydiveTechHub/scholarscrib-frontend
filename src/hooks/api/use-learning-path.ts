"use client";

import { useMutation } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";

/**
 * The pretest endpoint does both halves: an empty body starts an attempt,
 * `{ attemptId, answers }` grades it.
 */
export function usePretest<T>() {
  return useMutation({
    mutationFn: ({ topicId, body }: { topicId: string; body: Record<string, unknown> }) =>
      request<T>({
        method: "POST",
        url: endpoints.learningPath.pretest(topicId),
        data: body,
      }),
  });
}
