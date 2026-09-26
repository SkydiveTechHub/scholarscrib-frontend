"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { AudienceFilter } from "@/lib/push-audience";

export type AudiencePreview = { students: number; subscribedStudents: number; devices: number };

type AnnouncementMessage = { title: string; body: string; url: string | null };

/** How many students and devices an audience reaches. A POST: the filter is a body. */
export function usePreviewAudience() {
  return useMutation({
    mutationFn: (audience: AudienceFilter) =>
      request<AudiencePreview>({
        method: "POST",
        url: endpoints.admin.announcements.preview,
        data: { audience },
        realm: "admin",
      }),
  });
}

export function useSendTestAnnouncement() {
  return useMutation({
    mutationFn: (input: AnnouncementMessage & { contact: string }) =>
      request<{ student: string; sent: number; devices: number }>({
        method: "POST",
        url: endpoints.admin.announcements.test,
        data: input,
        realm: "admin",
      }),
  });
}

export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: AnnouncementMessage & { audience: AudienceFilter; expiresInDays: number },
    ) =>
      request<{ recipientCount: number }>({
        method: "POST",
        url: endpoints.admin.announcements.list,
        data: input,
        realm: "admin",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements() }),
  });
}

export function useCancelAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) =>
      request<unknown>({
        method: "POST",
        url: endpoints.admin.announcements.cancel(announcementId),
        data: {},
        realm: "admin",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements() }),
  });
}
