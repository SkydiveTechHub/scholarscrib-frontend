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
import { contextKey, createBodyFor } from "@/lib/tutor/context";
import { mapApiThread } from "@/lib/tutor/map";
import type {
  TutorApiThread,
  TutorContext,
  TutorThread,
} from "@/lib/tutor/types";
import { useTutorStore } from "@/stores/tutor-store";

async function fetchThread(threadId: string): Promise<TutorThread> {
  const raw = await request<TutorApiThread>({
    method: "GET",
    url: endpoints.tutor.thread(threadId),
  });
  // Soft-archived threads stay readable; treat them as expired for resume.
  if (raw.archived) {
    throw new Error("archived");
  }
  return mapApiThread(raw);
}

async function createThread(context: TutorContext): Promise<TutorThread> {
  if (context.type === "lesson") {
    const raw = await request<TutorApiThread>({
      method: "POST",
      url: endpoints.lessons.tutor(context.lessonId),
      data: {},
    });
    return mapApiThread(raw);
  }
  const raw = await request<TutorApiThread>({
    method: "POST",
    url: endpoints.tutor.threads,
    data: createBodyFor(context),
  });
  return mapApiThread(raw);
}

/**
 * Ensure a thread for this context: resume from the session cache, or create.
 * Never served stale — the live conversation lives in the chat reducer.
 */
export function tutorThreadQuery(
  context: TutorContext,
  cachedThreadId: string | undefined,
) {
  const key = contextKey(context);
  return queryOptions({
    queryKey: queryKeys.tutor.thread(key),
    queryFn: async () => {
      if (cachedThreadId) {
        try {
          return await fetchThread(cachedThreadId);
        } catch {
          // Cached id may be archived or missing — fall through to create.
        }
      }
      const created = await createThread(context);
      useTutorStore.getState().rememberThread(key, created.threadId);
      return created;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useTutorThread(context: TutorContext, enabled: boolean) {
  const key = contextKey(context);
  const cachedThreadId = useTutorStore((s) => s.threadIds[key]);
  return useQuery({ ...tutorThreadQuery(context, cachedThreadId), enabled });
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
    mutationFn: async (input: { threadId: string; contextKey: string }) => {
      await request({
        method: "DELETE",
        url: endpoints.tutor.thread(input.threadId),
      });
    },
    onSuccess: async (_data, input) => {
      useTutorStore.getState().forgetThread(input.contextKey);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tutor.thread(input.contextKey),
      });
    },
  });
}

/** Reload persisted messages after a dropped stream. */
export async function reloadTutorThread(
  threadId: string,
): Promise<TutorThread> {
  return fetchThread(threadId);
}
