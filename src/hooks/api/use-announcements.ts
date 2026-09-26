"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";

export function useDismissAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<unknown>({
        method: "POST",
        url: endpoints.announcements.dismiss(id),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all }),
  });
}
