"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  CreateRecommendationIn,
  CreateRecommendationsOut,
  RecommendationOut,
  RecommendationsListOut,
  UpdateRecommendationStatusIn,
} from "@/lib/api/types";

export function useCenterRecommendations(centerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.center.recommendations(centerId ?? ""),
    queryFn: () =>
      request<RecommendationsListOut>({
        method: "GET",
        url: endpoints.centerApi.recommendations.list(centerId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId),
    staleTime: 20_000,
  });
}

export function useCreateRecommendation(centerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRecommendationIn) =>
      request<CreateRecommendationsOut>({
        method: "POST",
        url: endpoints.centerApi.recommendations.create(centerId),
        data: body,
        realm: "tutor",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.center.recommendations(centerId),
      }),
  });
}

export function useStudentRecommendations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.centers.recommendations(),
    queryFn: () =>
      request<RecommendationsListOut>({
        method: "GET",
        url: endpoints.centers.recommendations,
      }),
    enabled,
    staleTime: 15_000,
  });
}

export function useUpdateStudentRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recommendationId,
      body,
    }: {
      recommendationId: string;
      body: UpdateRecommendationStatusIn;
    }) =>
      request<{ recommendation: RecommendationOut }>({
        method: "PATCH",
        url: endpoints.centers.recommendation(recommendationId),
        data: body,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.centers.recommendations(),
      }),
  });
}
