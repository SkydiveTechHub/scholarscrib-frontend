"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { OkOut, StudentDetailOut } from "@/lib/api/types";

function useInvalidateStudents() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.students() });
}

export function useUpdateStudent() {
  const onSuccess = useInvalidateStudents();
  return useMutation({
    mutationFn: ({ studentId, body }: { studentId: string; body: Record<string, string> }) =>
      request<StudentDetailOut>({
        method: "PATCH",
        url: endpoints.admin.students.detail(studentId),
        data: body,
        realm: "admin",
      }),
    onSuccess,
  });
}

export function useSetStudentActive() {
  const onSuccess = useInvalidateStudents();
  return useMutation({
    mutationFn: ({
      studentId,
      body,
    }: {
      studentId: string;
      body: { isActive: true } | { isActive: false; reason: string };
    }) =>
      request<OkOut>({
        method: "POST",
        url: endpoints.admin.students.status(studentId),
        data: body,
        realm: "admin",
      }),
    onSuccess,
  });
}

export function useForceSignOutStudent() {
  const onSuccess = useInvalidateStudents();
  return useMutation({
    mutationFn: (studentId: string) =>
      request<OkOut>({
        method: "POST",
        url: endpoints.admin.students.forceSignout(studentId),
        realm: "admin",
      }),
    onSuccess,
  });
}

export function useDeleteStudent() {
  const onSuccess = useInvalidateStudents();
  return useMutation({
    mutationFn: (studentId: string) =>
      request<OkOut>({
        method: "DELETE",
        url: endpoints.admin.students.detail(studentId),
        realm: "admin",
      }),
    onSuccess,
  });
}

export function useSetStudentTier() {
  const onSuccess = useInvalidateStudents();
  return useMutation({
    mutationFn: ({
      studentId,
      ...body
    }: {
      studentId: string;
      tier: string;
      period: string;
      note?: string;
    }) =>
      request<OkOut>({
        method: "POST",
        url: endpoints.admin.students.tier(studentId),
        data: body,
        realm: "admin",
      }),
    onSuccess,
  });
}
