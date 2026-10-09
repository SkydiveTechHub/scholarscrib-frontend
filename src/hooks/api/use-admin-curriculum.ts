"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AdminCurriculumOut,
  AdminSubjectOut,
  AdminTopicOut,
  TrackCategory,
} from "@/lib/api/types";

export type SubjectInput = {
  name: string;
  code: string;
  trackCategory: TrackCategory;
  isWaec: boolean;
  isJamb: boolean;
  isNeco: boolean;
  isActive: boolean;
};

export type TopicInput = {
  title: string;
  estimatedMinutes: number;
  waecWeight: number;
  jambWeight: number;
};

export function useAdminSubjects() {
  return useQuery({
    queryKey: queryKeys.admin.subjects(),
    queryFn: async () =>
      (
        await request<{ subjects: AdminSubjectOut[] }>({
          url: endpoints.admin.subjects.list,
          realm: "admin",
        })
      ).subjects,
  });
}

export function useAdminCurriculums(subjectId: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.curriculums(subjectId ?? ""),
    enabled: !!subjectId,
    queryFn: async () =>
      (
        await request<{ curriculums: AdminCurriculumOut[] }>({
          url: endpoints.admin.curriculums.list,
          params: { subjectId },
          realm: "admin",
        })
      ).curriculums,
  });
}

export function useAdminTopics(curriculumId: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.curriculumTopics(curriculumId ?? ""),
    enabled: !!curriculumId,
    queryFn: async () =>
      (
        await request<{ topics: AdminTopicOut[] }>({
          url: endpoints.admin.curriculums.topics(curriculumId as string),
          realm: "admin",
        })
      ).topics,
  });
}

/** Any catalogue write can change counts and ordering anywhere, so refresh the lot. */
function useCatalogueMutation<V, R>(fn: (vars: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.all }),
  });
}

const admin = { realm: "admin" as const };

export const useSaveSubject = () =>
  useCatalogueMutation((v: { id?: string; body: Partial<SubjectInput> }) =>
    request<AdminSubjectOut>(
      v.id
        ? { method: "PATCH", url: endpoints.admin.subjects.detail(v.id), data: v.body, ...admin }
        : { method: "POST", url: endpoints.admin.subjects.list, data: v.body, ...admin },
    ),
  );

export const useDeleteSubject = () =>
  useCatalogueMutation((id: string) =>
    request({ method: "DELETE", url: endpoints.admin.subjects.detail(id), ...admin }),
  );

export const useCreateCurriculum = () =>
  useCatalogueMutation((body: { subjectId: string; classLevel: string; term: string }) =>
    request<AdminCurriculumOut>({
      method: "POST",
      url: endpoints.admin.curriculums.list,
      data: body,
      ...admin,
    }),
  );

export const useDeleteCurriculum = () =>
  useCatalogueMutation((id: string) =>
    request({ method: "DELETE", url: endpoints.admin.curriculums.detail(id), ...admin }),
  );

export const useCreateTopic = () =>
  useCatalogueMutation((v: { curriculumId: string; body: TopicInput }) =>
    request<AdminTopicOut>({
      method: "POST",
      url: endpoints.admin.curriculums.topics(v.curriculumId),
      data: v.body,
      ...admin,
    }),
  );

export const useUpdateTopic = () =>
  useCatalogueMutation(
    (v: {
      id: string;
      body: Partial<TopicInput> & { curriculumLevelId?: string; orderIndex?: number };
    }) =>
      request<AdminTopicOut>({
        method: "PATCH",
        url: endpoints.admin.topics.detail(v.id),
        data: v.body,
        ...admin,
      }),
  );

export const useDeleteTopic = () =>
  useCatalogueMutation((id: string) =>
    request({ method: "DELETE", url: endpoints.admin.topics.detail(id), ...admin }),
  );
