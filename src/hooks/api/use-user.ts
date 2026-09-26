"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { AvatarOut } from "@/lib/api/types";
import type { NotificationPreferences } from "@/lib/push-validators";

/** Profile edits change what the session and profile reads return. */
function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.session.all }),
    ]);
}

export type CompleteProfileInput = {
  classLevel: string;
  track: string;
  state: string;
};

export function useCompleteProfile() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: CompleteProfileInput) =>
      request<{ ok: boolean }>({
        method: "POST",
        url: endpoints.user.completeProfile,
        data: input,
      }),
    onSuccess: invalidate,
  });
}

export type ProfileUpdateInput = Partial<{
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  classLevel: string;
  track: string;
}>;

export function useUpdateProfile() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) =>
      request<unknown>({
        method: "PATCH",
        url: endpoints.user.profile,
        data: input,
      }),
    onSuccess: invalidate,
  });
}

export function useUploadAvatar() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    // FormData: axios sets the multipart boundary itself.
    mutationFn: (file: File) => {
      const data = new FormData();
      data.append("file", file);
      return request<AvatarOut>({
        method: "POST",
        url: endpoints.user.avatar,
        data,
      });
    },
    onSuccess: invalidate,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      request<unknown>({
        method: "POST",
        url: endpoints.user.password,
        data: input,
      }),
  });
}

export type DeviceSignOutInput = { deviceId: string } | { allOthers: true };

export function useSignOutDevices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeviceSignOutInput) =>
      request<unknown>({
        method: "POST",
        url: endpoints.user.devices,
        data: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.user.devices() }),
  });
}

export function useUpdateNotificationPreferences() {
  return useMutation({
    mutationFn: (input: Partial<NotificationPreferences>) =>
      request<unknown>({
        method: "PATCH",
        url: endpoints.user.notificationPreferences,
        data: input,
      }),
  });
}
