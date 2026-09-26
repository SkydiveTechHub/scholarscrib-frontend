"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { ReviewOutcome } from "@/types/flashcards";
import type { ReviewRating } from "@/lib/spaced-repetition";

/**
 * What a lesson's deck would hold. Fetched from a click handler through
 * `queryClient.fetchQuery(flashcardPreviewQuery(lessonId))`.
 */
export function flashcardPreviewQuery<T>(lessonId: string) {
  return queryOptions({
    queryKey: queryKeys.flashcards.preview(lessonId),
    queryFn: () =>
      request<T>({
        method: "GET",
        url: endpoints.flashcards.preview,
        params: { lessonId },
      }),
  });
}

/** Builds (or rebuilds) a lesson's deck. */
export function useGenerateDeck<T>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { lessonId: string }) =>
      request<T>({
        method: "POST",
        url: endpoints.flashcards.generate,
        data: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all }),
  });
}

export function useReviewFlashcard() {
  return useMutation({
    mutationFn: (input: {
      flashcardId: string;
      rating: ReviewRating;
      responseTimeMs: number;
      objectiveCorrect: boolean | null;
    }) =>
      request<{ review: ReviewOutcome }>({
        method: "POST",
        url: endpoints.flashcards.review,
        data: input,
      }),
  });
}

export function useEnrollDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deckId, enrolled }: { deckId: string; enrolled: boolean }) =>
      request<unknown>({
        method: "POST",
        url: endpoints.flashcards.enroll(deckId),
        data: { enrolled },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all }),
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckId: string) =>
      request<unknown>({
        method: "DELETE",
        url: endpoints.flashcards.deck(deckId),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.all }),
  });
}
