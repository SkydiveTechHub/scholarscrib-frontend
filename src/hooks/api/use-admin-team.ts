"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { AdminRowOut, OkOut } from "@/lib/api/types";

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { identifier: string; password: string }) =>
      request<{ admin: AdminRowOut }>({
        method: "POST",
        url: endpoints.admin.admins,
        data: input,
        realm: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.admins() }),
  });
}

export function useSetAdminActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ adminId, isActive }: { adminId: string; isActive: boolean }) =>
      request<OkOut>({
        method: "PATCH",
        url: endpoints.admin.adminStatus(adminId),
        data: { isActive },
        realm: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.admins() }),
  });
}
