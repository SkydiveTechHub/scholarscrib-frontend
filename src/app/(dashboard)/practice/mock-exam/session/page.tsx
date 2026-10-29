"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useGenerateMockExam } from "@/hooks/api/use-assessments";
import {
  MOCK_EXAM_MIN_QUESTIONS,
  scopedMockExamCount,
} from "@/lib/mock-exam";
import { ExamSurface } from "@/components/assessment/exam-surface";
import {
  useExamSession,
  type GeneratedExam,
} from "@/components/assessment/use-exam-session";
import type { ScopePoint } from "@/lib/curriculum-scope";

function MockExamSession() {
  const searchParams = useSearchParams();

  const examType = searchParams.get("examType") || undefined;
  const subjectId = searchParams.get("subjectId") || "";
  const requested = Number(searchParams.get("count") || 40);
  // Same rule as the picker. A hand-built link with count under 5 must not
  // reach the API, which would answer with a validation error.
  const count = scopedMockExamCount(requested, requested);

  const from = useMemo<ScopePoint>(
    () => ({
      classLevel: (searchParams.get("fromClass") || "SS1") as ScopePoint["classLevel"],
      term: (searchParams.get("fromTerm") || "FIRST") as ScopePoint["term"],
    }),
    [searchParams],
  );
  const to = useMemo<ScopePoint>(
    () => ({
      classLevel: (searchParams.get("toClass") || "SS1") as ScopePoint["classLevel"],
      term: (searchParams.get("toTerm") || "FIRST") as ScopePoint["term"],
    }),
    [searchParams],
  );

  // Distinct per configuration, so two different scopes never share a saved
  // session — resuming one into the other would show the wrong paper.
  const sessionKey = useMemo(
    () =>
      [
        "mock",
        examType ?? "all",
        subjectId,
        from.classLevel,
        from.term,
        to.classLevel,
        to.term,
        count ?? requested,
      ].join(":"),
    [examType, subjectId, from, to, count, requested],
  );

  // mutateAsync is stable, so `generate` only changes with the scope.
  const { mutateAsync: generateMockExam } = useGenerateMockExam();
  const generate = useCallback(async (): Promise<GeneratedExam> => {
    if (count === null) {
      throw new Error(
        `A mock exam needs at least ${MOCK_EXAM_MIN_QUESTIONS} questions. Go back and choose a wider scope.`,
      );
    }
    return generateMockExam({ examType, subjectId, from, to, count });
  }, [generateMockExam, examType, subjectId, from, to, count]);

  const toResult = useCallback(
    (attemptId: string) => `/practice/results/${attemptId}`,
    [],
  );

  const session = useExamSession({
    sessionKey,
    generate,
    resultHref: toResult,
    defaultTimeLimitMinutes: Math.ceil((count ?? MOCK_EXAM_MIN_QUESTIONS) * 1.5),
  });

  return (
    <ExamSurface
      session={session}
      eyebrow={examType ?? "Mock exam"}
      backHref="/practice/mock-exam"
      confirmTitle="Submit mock exam?"
    />
  );
}

export default function MockExamSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        </div>
      }
    >
      <MockExamSession />
    </Suspense>
  );
}
