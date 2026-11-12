"use client";

import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AssignmentItemAnalysisOut,
  AssignmentOverviewOut,
  AssignmentStudentsOut,
  ScopedStudentDetailOut,
} from "@/lib/api/types";

export function useAssignmentOverview(
  centerId: string | null | undefined,
  assignmentId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.center.assignmentOverview(assignmentId ?? ""),
    queryFn: () =>
      request<AssignmentOverviewOut>({
        method: "GET",
        url: endpoints.centerApi.assignments.overview(centerId!, assignmentId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId && assignmentId),
    staleTime: 15_000,
  });
}

export function useAssignmentStudentRows(
  centerId: string | null | undefined,
  assignmentId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.center.assignmentStudents(assignmentId ?? ""),
    queryFn: () =>
      request<AssignmentStudentsOut>({
        method: "GET",
        url: endpoints.centerApi.assignments.students(centerId!, assignmentId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId && assignmentId),
    staleTime: 15_000,
  });
}

export function useAssignmentItemAnalysis(
  centerId: string | null | undefined,
  assignmentId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.center.assignmentItems(assignmentId ?? ""),
    queryFn: () =>
      request<AssignmentItemAnalysisOut>({
        method: "GET",
        url: endpoints.centerApi.assignments.items(centerId!, assignmentId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId && assignmentId),
    staleTime: 30_000,
  });
}

export function useScopedStudentDetail(
  centerId: string | null | undefined,
  studentId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.center.studentResults(
      centerId ?? "",
      studentId ?? "",
    ),
    queryFn: () =>
      request<ScopedStudentDetailOut>({
        method: "GET",
        url: endpoints.centerApi.students.results(centerId!, studentId!),
        realm: "tutor",
      }),
    enabled: Boolean(centerId && studentId),
    staleTime: 15_000,
  });
}
