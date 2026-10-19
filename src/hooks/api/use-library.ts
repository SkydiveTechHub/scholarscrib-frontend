"use client";

import { queryOptions } from "@tanstack/react-query";
import { API_URL } from "@/lib/api/config";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";

type LibraryRows =
  | Record<string, unknown>[]
  | { resources?: Record<string, unknown>[] };

/**
 * One subject's resources. Fetched from a click handler through
 * `queryClient.fetchQuery(libraryResourcesQuery(subjectId))`.
 */
export function libraryResourcesQuery(subjectId: string) {
  return queryOptions({
    queryKey: queryKeys.library.subject(subjectId),
    queryFn: async () => {
      const data = await request<LibraryRows>({
        method: "GET",
        url: endpoints.library,
        params: { subjectId },
      });
      const rows = Array.isArray(data) ? data : (data.resources ?? []);
      // Private files come back as a path on the API, not a full URL.
      return rows.map((row) =>
        typeof row.url === "string" && row.url.startsWith("/")
          ? { ...row, url: `${API_URL}${row.url}` }
          : row,
      );
    },
  });
}
