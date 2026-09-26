"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { MaterialOut, OkOut } from "@/lib/api/types";

/** A one-upload Cloudinary authorisation issued by the backend. */
export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string[];
  maxBytes: number;
  resourceType: "image" | "raw";
};

export function useSignMaterialUpload() {
  return useMutation({
    mutationFn: (type: string) =>
      request<UploadSignature>({
        method: "POST",
        url: endpoints.admin.materials.sign,
        data: { type },
        realm: "admin",
      }),
  });
}

/** Create (with `subjectId`) or update (with `id`) a material. */
export function useSaveMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input:
        | { id: string; payload: Record<string, unknown> }
        | { subjectId: string | null; payload: Record<string, unknown> },
    ) =>
      request<MaterialOut>(
        "subjectId" in input
          ? {
              method: "POST",
              url: endpoints.admin.materials.list,
              data: { ...input.payload, subjectId: input.subjectId },
              realm: "admin",
            }
          : {
              method: "PATCH",
              url: endpoints.admin.materials.detail(input.id),
              data: input.payload,
              realm: "admin",
            },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.materials() }),
  });
}

export function useReorderMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orderIndex }: { id: string; orderIndex: number }) =>
      request<MaterialOut>({
        method: "PATCH",
        url: endpoints.admin.materials.detail(id),
        data: { orderIndex },
        realm: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.materials() }),
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<OkOut>({
        method: "DELETE",
        url: endpoints.admin.materials.detail(id),
        realm: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.materials() }),
  });
}
