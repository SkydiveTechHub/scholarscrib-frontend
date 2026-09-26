"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { TermOut } from "@/lib/api/types";

export type TermInput = { session: string; term: string; startsOn: string; endsOn: string };

/** Create (no id), update (id + term) or delete (id + `remove`) an academic term. */
export type SaveTermInput =
  | { id?: undefined; term: TermInput }
  | { id: string; term: TermInput }
  | { id: string; remove: true };

export function useSaveAcademicTerm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveTermInput) => {
      if ("remove" in input) {
        return request<TermOut>({
          method: "DELETE",
          url: endpoints.admin.academicTerms.detail(input.id),
          realm: "admin",
        });
      }
      return request<TermOut>(
        input.id
          ? {
              method: "PATCH",
              url: endpoints.admin.academicTerms.detail(input.id),
              data: input.term,
              realm: "admin",
            }
          : {
              method: "POST",
              url: endpoints.admin.academicTerms.list,
              data: input.term,
              realm: "admin",
            },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.academicTerms() }),
  });
}
