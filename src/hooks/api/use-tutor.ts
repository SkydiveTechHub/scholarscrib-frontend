"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import { contextKey, threadParams } from "@/lib/tutor/context";
import type { TutorContext, TutorStatus, TutorThread } from "@/lib/tutor/types";

export function tutorStatusQuery() {
  return queryOptions({
    queryKey: queryKeys.tutor.status(),
    queryFn: () =>
      request<TutorStatus>({ method: "GET", url: endpoints.tutor.status }),
    staleTime: 30_000,
  });
}

export function useTutorStatus(enabled: boolean) {
  return useQuery({ ...tutorStatusQuery(), enabled });
}

/**
 * Never served stale: the live conversation lives in the chat reducer, which is
 * gone when the panel closes, so a cached thread from before the exchange would
 * make a reopened panel look like it forgot everything.
 */
export function tutorThreadQuery(context: TutorContext) {
  return queryOptions({
    queryKey: queryKeys.tutor.thread(contextKey(context)),
    queryFn: () =>
      request<TutorThread>({
        method: "GET",
        url: endpoints.tutor.currentThread,
        params: threadParams(context),
      }),
    staleTime: 0,
    gcTime: 0,
    // The open conversation is keyed by thread id and read once at mount, so a
    // focus refetch would only spend the student's data.
    refetchOnWindowFocus: false,
  });
}

export function useTutorThread(context: TutorContext, enabled: boolean) {
  return useQuery({ ...tutorThreadQuery(context), enabled });
}

export function useTutorFeedback() {
  return useMutation({
    mutationFn: (input: { messageId: string; rating: "up" | "down" }) =>
      request({
        method: "POST",
        url: endpoints.tutor.feedback(input.messageId),
        data: { rating: input.rating },
      }),
  });
}

export function useClearTutorThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { threadId: string; contextKey: string }) =>
      request({ method: "DELETE", url: endpoints.tutor.thread(input.threadId) }),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.tutor.thread(input.contextKey),
      }),
  });
}
