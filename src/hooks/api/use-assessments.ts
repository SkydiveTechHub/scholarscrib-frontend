"use client";

import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { GeneratedExam } from "@/components/assessment/use-exam-session";
import type {
  CoverageSubjectsOut,
  CoverageYearsOut,
  ExplanationOut,
} from "@/lib/api/types";
import type { BoardStatus } from "@/lib/board-availability";
import type { ScopePoint } from "@/lib/curriculum-scope";

// ─── Exam generation ───────────────────────────────────────

export type GenerateQuizInput = {
  subjectSlug: string;
  topicSlug?: string;
  examType?: string;
  examYear?: number;
  title?: string;
  untimed?: boolean;
  count: number;
};

/** Single-subject quiz: topic quizzes, past-question sets, practice exits. */
export function useGenerateQuiz() {
  return useMutation({
    mutationFn: (input: GenerateQuizInput) =>
      request<GeneratedExam>({
        method: "POST",
        url: endpoints.assessments.generate,
        data: input,
      }),
  });
}

export type MockExamScopeInput = {
  examType: string;
  subjectId: string;
  from: ScopePoint;
  to: ScopePoint;
  count: number;
};

export function useGenerateMockExam() {
  return useMutation({
    mutationFn: (input: MockExamScopeInput) =>
      request<GeneratedExam>({
        method: "POST",
        url: endpoints.assessments.mockExam.scoped,
        data: input,
      }),
  });
}

export type JambCbtInput = { subjectIds: string[]; examYear: number };

export function useGenerateJambCbt() {
  return useMutation({
    mutationFn: (input: JambCbtInput) =>
      request<GeneratedExam>({
        method: "POST",
        url: endpoints.assessments.jambCbt.generate,
        data: input,
      }),
  });
}

/** Pulls the four papers for a JAMB year and reports what the bank now holds. */
export function usePrepareJambCbt<T>() {
  return useMutation({
    mutationFn: (input: JambCbtInput) =>
      request<T>({
        method: "POST",
        url: endpoints.assessments.jambCbt.prepare,
        data: input,
      }),
  });
}

// ─── Submission ─────────────────────────────────────────────

export function useSubmitAssessment() {
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request<unknown>({
        method: "POST",
        url: endpoints.assessments.submit,
        data: input,
      }),
  });
}

// ─── Mock exam options ─────────────────────────────────────

export function useMockExamBoards() {
  return useQuery({
    queryKey: queryKeys.assessments.mockExamBoards(),
    queryFn: () =>
      request<{ boards: Record<string, BoardStatus> }>({
        method: "GET",
        url: endpoints.assessments.mockExam.boards,
      }),
  });
}

/**
 * Subjects available for one board. Fetched from a click handler through
 * `queryClient.fetchQuery(mockExamOptionsQuery(board))`, so it shares the
 * cache without turning the picker's step logic into an effect.
 */
export function mockExamOptionsQuery<T>(examType: string) {
  return queryOptions({
    queryKey: queryKeys.assessments.mockExamOptions(examType),
    queryFn: () =>
      request<{ subjects: T[] }>({
        method: "GET",
        url: endpoints.assessments.mockExam.options,
        params: { examType },
      }),
  });
}

// ─── Explanations ───────────────────────────────────────────

/**
 * A question's explanation. Only fetched while `enabled`: a provider
 * explanation is bought on first request, so it must never be prefetched.
 */
export function useQuestionExplanation(questionId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.questions.explanation(questionId),
    queryFn: () =>
      request<ExplanationOut>({
        method: "GET",
        url: endpoints.questions.explanation(questionId),
      }),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}

// ─── Past papers ────────────────────────────────────────────

/** Every subject the question provider holds, with the exams it covers. */
export function useCoverageSubjects() {
  return useQuery({
    queryKey: queryKeys.questions.coverageSubjects(),
    queryFn: () =>
      request<CoverageSubjectsOut>({
        method: "GET",
        url: endpoints.questions.coverageSubjects,
        anonymous: true,
      }),
    staleTime: 60 * 60 * 1000,
  });
}

/** The years the provider holds for one subject (its provider key), every exam. */
export function useCoverageSubjectYears(subject: string | null) {
  return useQuery({
    queryKey: queryKeys.questions.coverageSubjectYears(subject ?? ""),
    queryFn: () =>
      request<CoverageYearsOut>({
        method: "GET",
        url: endpoints.questions.coverageSubjectYears(subject ?? ""),
        anonymous: true,
      }),
    enabled: Boolean(subject),
    staleTime: 60 * 60 * 1000,
  });
}

export function usePastPapers<T>() {
  return useQuery({
    queryKey: queryKeys.questions.pastPapers(),
    queryFn: () =>
      request<{ papers: T[] }>({
        method: "GET",
        url: endpoints.questions.pastPapers,
        anonymous: true,
      }),
  });
}
