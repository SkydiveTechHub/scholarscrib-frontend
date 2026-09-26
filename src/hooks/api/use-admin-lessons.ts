"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { LessonImportOut, LessonTopicOut } from "@/lib/api/types";

/**
 * What is currently stored for a topic, fetched on demand. The caller owns the
 * AbortSignal because it arbitrates between overlapping lookups itself.
 */
export function useFetchAdminLessonTopic() {
  const queryClient = useQueryClient();
  return useCallback(
    async (topicId: string, signal: AbortSignal) => {
      const data = await request<LessonTopicOut>({
        method: "GET",
        url: endpoints.admin.lessons.topic(topicId),
        realm: "admin",
        signal,
      });
      queryClient.setQueryData(queryKeys.admin.lessonTopic(topicId), data);
      return data;
    },
    [queryClient],
  );
}

export function useImportLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { topicId: string; markdown: string; confirm: true }) =>
      request<LessonImportOut>({
        method: "POST",
        url: endpoints.admin.lessons.import,
        data: input,
        realm: "admin",
      }),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.lessonTopic(input.topicId) }),
  });
}
