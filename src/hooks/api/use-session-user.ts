"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { SessionOut } from "@/lib/api/types";

/** The signed-in student, for client pages the server can't hand it to. */
export function useSessionUser() {
  return useQuery({
    queryKey: queryKeys.session.all,
    queryFn: () => request<SessionOut>({ method: "GET", url: endpoints.auth.session }),
    select: (data) => data.user,
  });
}
