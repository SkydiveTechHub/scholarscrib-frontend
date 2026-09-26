"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AdminQuestionsOut,
  DeleteQuestionsOut,
  IdOut,
  ImportQuestionsOut,
  SubjectsOut,
  UsageOut,
} from "@/lib/api/types";

/** Prefix of every admin question query: list pages and usage lookups. */
const ADMIN_QUESTIONS_KEY = [...queryKeys.admin.all, "questions"] as const;

/** Public subject catalogue, used by the admin question filters. */
export function useSubjectCatalogue() {
  return useQuery({
    queryKey: queryKeys.subjects.all,
    queryFn: ({ signal }) =>
      request<SubjectsOut>({
        method: "GET",
        url: endpoints.subjects.list,
        anonymous: true,
        signal,
      }),
  });
}

/** One page of the admin question list. Keeps the previous page on screen while the next loads. */
export function useAdminQuestions(params: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.admin.questions(params),
    queryFn: ({ signal }) =>
      request<AdminQuestionsOut>({
        method: "GET",
        url: endpoints.admin.questions.list,
        params,
        realm: "admin",
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetches a question's usage on demand (before a delete), always fresh: the
 * answer decides whether the delete is offered at all.
 */
export function useFetchQuestionUsage() {
  const queryClient = useQueryClient();
  return useCallback(
    (questionId: string) =>
      queryClient.fetchQuery({
        queryKey: queryKeys.admin.questionUsage(questionId),
        queryFn: ({ signal }) =>
          request<UsageOut>({
            method: "GET",
            url: endpoints.admin.questions.usage(questionId),
            realm: "admin",
            signal,
          }),
        staleTime: 0,
      }),
    [queryClient],
  );
}

/**
 * Deletes one question (`{ id }`) or many (`{ ids }`). The page removes the
 * rows it can see itself; every other cached page is only marked stale, so
 * the current view does not jump while the admin is looking at it.
 */
export function useDeleteQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } | { ids: string[] }) =>
      request<DeleteQuestionsOut>({
        method: "DELETE",
        url: endpoints.admin.questions.list,
        ...("id" in input ? { params: { id: input.id } } : { data: { ids: input.ids } }),
        realm: "admin",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_QUESTIONS_KEY, refetchType: "none" }),
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: unknown) =>
      request<IdOut>({
        method: "POST",
        url: endpoints.admin.questions.list,
        data: input,
        realm: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUESTIONS_KEY }),
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: unknown }) =>
      request<IdOut>({
        method: "PATCH",
        url: endpoints.admin.questions.detail(id),
        data: patch,
        realm: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUESTIONS_KEY }),
  });
}

export function useImportQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { questions: unknown[]; skipDuplicates: boolean }) =>
      request<ImportQuestionsOut>({
        method: "POST",
        url: endpoints.admin.questions.import,
        data: input,
        realm: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUESTIONS_KEY }),
  });
}
