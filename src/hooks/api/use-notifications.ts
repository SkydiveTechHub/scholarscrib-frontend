"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { NotificationsOut, UnreadCountOut } from "@/lib/api/types";

const UNREAD_POLL_MS = 60_000;

type ListCache = InfiniteData<NotificationsOut, string | null>;

/**
 * The badge number. Polled while the tab is visible and re-read on focus, so a
 * reminder that lands while the app is backgrounded shows up the moment the
 * student comes back.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () =>
      request<UnreadCountOut>({ method: "GET", url: endpoints.notifications.unreadCount }),
    select: (data) => data.count,
    refetchInterval: UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

/** The inbox itself. Only fetches while the panel is open. */
export function useNotifications(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(),
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      request<NotificationsOut>({
        method: "GET",
        url: endpoints.notifications.list,
        params: pageParam ? { cursor: pageParam } : undefined,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

function patchList(
  data: ListCache | undefined,
  patch: (id: string, readAt: string | null | undefined) => string | null | undefined,
): ListCache | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      notifications: page.notifications.map((n) => ({
        ...n,
        readAt: patch(n.id, n.readAt),
      })),
    })),
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.notifications.list();
  const countKey = queryKeys.notifications.unreadCount();

  return useMutation({
    mutationFn: (id: string) =>
      request<unknown>({ method: "POST", url: endpoints.notifications.read(id) }),
    // Optimistic: the dot and the badge must react on tap, not after a round trip.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const previousList = queryClient.getQueryData<ListCache>(listKey);
      const previousCount = queryClient.getQueryData<UnreadCountOut>(countKey);
      const wasUnread = previousList?.pages.some((page) =>
        page.notifications.some((n) => n.id === id && !n.readAt),
      );
      const stamp = new Date().toISOString();
      queryClient.setQueryData<ListCache>(listKey, (data) =>
        patchList(data, (nid, readAt) => (nid === id ? (readAt ?? stamp) : readAt)),
      );
      if (wasUnread) {
        queryClient.setQueryData<UnreadCountOut>(countKey, (data) =>
          data ? { count: Math.max(0, data.count - 1) } : data,
        );
      }
      return { previousList, previousCount };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(listKey, context?.previousList);
      queryClient.setQueryData(countKey, context?.previousCount);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.notifications.list();
  const countKey = queryKeys.notifications.unreadCount();

  return useMutation({
    mutationFn: () =>
      request<unknown>({ method: "POST", url: endpoints.notifications.readAll }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const previousList = queryClient.getQueryData<ListCache>(listKey);
      const previousCount = queryClient.getQueryData<UnreadCountOut>(countKey);
      const stamp = new Date().toISOString();
      queryClient.setQueryData<ListCache>(listKey, (data) =>
        patchList(data, (_id, readAt) => readAt ?? stamp),
      );
      queryClient.setQueryData<UnreadCountOut>(countKey, { count: 0 });
      return { previousList, previousCount };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(listKey, context?.previousList);
      queryClient.setQueryData(countKey, context?.previousCount);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}
