"use client";

import { useCallback } from "react";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import { contextKey } from "@/lib/tutor/context";
import { mapApiThread, mapApiThreadSummaries } from "@/lib/tutor/map";
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

/**
 * Resume this context's thread from the session cache. Resolves to null when
 * there is none: a thread is only created when the student sends their first
 * message (see useRememberStartedThread), so opening the panel or pressing
 * "New chat" never registers an empty session.
 * Never served stale — the live conversation lives in the chat reducer.
 */
export function tutorThreadQuery(
  context: TutorContext,
  cachedThreadId: string | undefined,
) {
  const key = contextKey(context);
  return queryOptions({
    queryKey: queryKeys.tutor.thread(key),
    queryFn: async (): Promise<TutorThread | null> => {
      if (!cachedThreadId) return null;
      try {
        return await fetchThread(cachedThreadId);
      } catch {
        // Cached id may be archived or missing — start over on first send.
        useTutorStore.getState().forgetThread(key);
        return null;
      }
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tutor.history(),
      });
    },
  });
}

/** The student's past conversations, newest first. */
export function useTutorHistory(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.tutor.history(),
    queryFn: async () => {
      const raw = await request<{ threads: TutorApiThread[] }>({
        method: "GET",
        url: endpoints.tutor.threads,
      });
      return mapApiThreadSummaries(raw.threads);
    },
    enabled,
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * Reopen a past conversation. The caller shows the returned thread; we only
 * remember it so closing and reopening the panel resumes the same one.
 */
export function useResumeTutorThread(contextKey: string) {
  return useMutation({
    mutationFn: (threadId: string) => fetchThread(threadId),
    onSuccess: (thread) =>
      useTutorStore.getState().rememberThread(contextKey, thread.threadId),
  });
}

/**
 * The server creates a new conversation's thread when the student's first
 * message arrives (`streamStarted` carries its id), so every thread has at
 * least one turn in it. Remember it so reopening the panel resumes it.
 */
export function useRememberStartedThread(context: TutorContext) {
  const queryClient = useQueryClient();
  const key = contextKey(context);
  return useCallback(
    (threadId: string) => {
      useTutorStore.getState().rememberThread(key, threadId);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tutor.history(),
      });
    },
    [key, queryClient],
  );
}

/** Remove one conversation from history. */
export function useDeleteTutorThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      await request({
        method: "DELETE",
        url: endpoints.tutor.thread(threadId),
      });
      return threadId;
    },
    onSuccess: async (threadId) => {
      const { threadIds, forgetThread } = useTutorStore.getState();
      for (const [key, id] of Object.entries(threadIds)) {
        if (id === threadId) {
          forgetThread(key);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.tutor.thread(key),
          });
        }
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tutor.history(),
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
