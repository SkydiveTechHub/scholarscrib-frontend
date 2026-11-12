"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  CenterCreateOut,
  CenterDetailOut,
  CenterGroupsOut,
  CenterGroupOut,
  CenterInviteMutationOut,
  CenterInviteOut,
  CenterInvitesOut,
  CenterOut,
  CentersListOut,
  CenterRosterOut,
  CreateCenterIn,
  CreateCenterInviteIn,
  OkOut,
  UpdateCenterIn,
} from "@/lib/api/types";

function useInvalidateCenter(centerId?: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.center.list() }),
      ...(centerId
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.center.detail(centerId),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.center.roster(centerId),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.center.groups(centerId),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.center.invites(centerId),
            }),
          ]
        : []),
    ]);
}

export function useTutorCenters(enabled = true) {
  return useQuery({
    queryKey: queryKeys.center.list(),
    queryFn: () =>
      request<CentersListOut>({
        method: "GET",
        url: endpoints.centerApi.centers.list,
        realm: "tutor",
      }),
    enabled,
    staleTime: 30_000,
  });
}

export function useTutorCenter(centerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.center.detail(centerId ?? ""),
    queryFn: async () => {
      const out = await request<CenterDetailOut>({
        method: "GET",
        url: endpoints.centerApi.centers.detail(centerId!),
        realm: "tutor",
      });
      return out.center;
    },
    enabled: Boolean(centerId),
    staleTime: 30_000,
  });
}

export function useCreateCenter() {
  const invalidate = useInvalidateCenter();
  return useMutation({
    mutationFn: async (body: CreateCenterIn) => {
      const out = await request<CenterCreateOut>({
        method: "POST",
        url: endpoints.centerApi.centers.create,
        data: body,
        realm: "tutor",
      });
      return out.center;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateCenter(centerId: string) {
  const invalidate = useInvalidateCenter(centerId);
  return useMutation({
    mutationFn: async (body: UpdateCenterIn) => {
      const out = await request<CenterDetailOut>({
        method: "PATCH",
        url: endpoints.centerApi.centers.update(centerId),
        data: body,
        realm: "tutor",
      });
      return out.center;
    },
    onSuccess: invalidate,
  });
}

export function useCenterRoster(centerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.center.roster(centerId ?? ""),
    queryFn: async () => {
      // Accept either `members` (current) or legacy `roster` key.
      const raw = await request<
        CenterRosterOut & { roster?: CenterRosterOut["members"] }
      >({
        method: "GET",
        url: endpoints.centerApi.roster.list(centerId!),
        realm: "tutor",
      });
      return {
        ...raw,
        members: raw.members ?? raw.roster ?? [],
      } satisfies CenterRosterOut;
    },
    enabled: Boolean(centerId),
    staleTime: 15_000,
  });
}

export function useRemoveRosterMember(centerId: string) {
  const invalidate = useInvalidateCenter(centerId);
  return useMutation({
    mutationFn: (membershipId: string) =>
      request<OkOut>({
        method: "DELETE",
        url: endpoints.centerApi.roster.remove(centerId, membershipId),
        realm: "tutor",
      }),
    onSuccess: invalidate,
  });
}

export function useCenterGroups(centerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.center.groups(centerId ?? ""),
    queryFn: () =>
      request<CenterGroupsOut>({
        method: "GET",
        url: endpoints.centerApi.groups.list(centerId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId),
    staleTime: 15_000,
  });
}

export function useCreateCenterGroup(centerId: string) {
  const invalidate = useInvalidateCenter(centerId);
  return useMutation({
    mutationFn: (body: { name: string }) =>
      request<CenterGroupOut>({
        method: "POST",
        url: endpoints.centerApi.groups.create(centerId),
        data: body,
        realm: "tutor",
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteCenterGroup(centerId: string) {
  const invalidate = useInvalidateCenter(centerId);
  return useMutation({
    mutationFn: (groupId: string) =>
      request<OkOut>({
        method: "DELETE",
        url: endpoints.centerApi.groups.detail(centerId, groupId),
        realm: "tutor",
      }),
    onSuccess: invalidate,
  });
}

export function useAddGroupMember(centerId: string) {
  const invalidate = useInvalidateCenter(centerId);
  return useMutation({
    mutationFn: ({
      groupId,
      membershipId,
    }: {
      groupId: string;
      membershipId: string;
    }) =>
      request<OkOut>({
        method: "POST",
        url: endpoints.centerApi.groups.addMember(centerId, groupId),
        data: { membershipId },
        realm: "tutor",
      }),
    onSuccess: invalidate,
  });
}

export function useRemoveGroupMember(centerId: string) {
  const invalidate = useInvalidateCenter(centerId);
  return useMutation({
    mutationFn: ({
      groupId,
      membershipId,
    }: {
      groupId: string;
      membershipId: string;
    }) =>
      request<OkOut>({
        method: "DELETE",
        url: endpoints.centerApi.groups.removeMember(
          centerId,
          groupId,
          membershipId,
        ),
        realm: "tutor",
      }),
    onSuccess: invalidate,
  });
}

export function useCenterInvites(centerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.center.invites(centerId ?? ""),
    queryFn: () =>
      request<CenterInvitesOut>({
        method: "GET",
        url: endpoints.centerApi.invites.list(centerId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId),
    staleTime: 15_000,
  });
}

export function useCreateCenterInvite(centerId: string) {
  const invalidate = useInvalidateCenter(centerId);
  return useMutation({
    mutationFn: async (body?: CreateCenterInviteIn) => {
      const out = await request<CenterInviteMutationOut>({
        method: "POST",
        url: endpoints.centerApi.invites.create(centerId),
        data: body ?? {},
        realm: "tutor",
      });
      return out;
    },
    onSuccess: invalidate,
  });
}

export function useRevokeCenterInvite(centerId: string) {
  const invalidate = useInvalidateCenter(centerId);
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const out = await request<CenterInviteMutationOut>({
        method: "POST",
        url: endpoints.centerApi.invites.revoke(centerId, inviteId),
        realm: "tutor",
      });
      return out.invite;
    },
    onSuccess: invalidate,
  });
}

export function useRegenerateCenterInvite(centerId: string) {
  const invalidate = useInvalidateCenter(centerId);
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const out = await request<CenterInviteMutationOut>({
        method: "POST",
        url: endpoints.centerApi.invites.regenerate(centerId, inviteId),
        realm: "tutor",
      });
      return out.invite;
    },
    onSuccess: invalidate,
  });
}
