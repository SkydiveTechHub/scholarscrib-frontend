"use client";

import { useCallback } from "react";
import { fetchApi } from "@/lib/api/client";
import type {
  CoverageSubjectOut,
  PastPaperPageOut,
  QuizOut,
} from "@/lib/api/types";
import { SECONDS_PER_QUESTION, toExamQuestion } from "@/lib/past-question-exam";
import { ExamSurface } from "@/components/assessment/exam-surface";
import {
  useExamSession,
  type ExamPage,
  type GeneratedExam,
} from "@/components/assessment/use-exam-session";

/**
 * One past paper, sat CBT-style and recorded like any other attempt.
 *
 * `POST /api/assessments/past-paper` fetches the paper's first page from the
 * question provider on the server, stores it, and starts a real attempt; each
 * further page is appended through `.../past-paper/{attemptId}/more` as the
 * student moves past the last question loaded. The answer key never reaches
 * the browser: the ordinary submit grades the paper server-side, so it shows
 * on the dashboard, in performance and in the learning path.
 */
export function PastPaperExam({
  exam,
  examLabel,
  subject,
  year,
  onExit,
}: {
  exam: string;
  examLabel: string;
  subject: CoverageSubjectOut;
  year: number;
  onExit: () => void;
}) {
  // Versioned: papers saved by the old browser-graded flow carry a "local:"
  // attempt id the backend has never seen, so they must not be resumed.
  const sessionKey = `past-paper:v2:${exam}:${subject.name}:${year}`;

  const generate = useCallback(async (): Promise<GeneratedExam> => {
    const paper = await fetchApi<QuizOut>("/api/assessments/past-paper", {
      method: "POST",
      body: { subject: subject.name, examType: exam, examYear: year },
    });
    return {
      attemptId: paper.attemptId,
      title: paper.title,
      questions: paper.questions.map(toExamQuestion),
      timeLimitMinutes: paper.timeLimitMinutes ?? null,
      deadlineAt: paper.deadlineAt ?? undefined,
      nextCursor: paper.nextCursor ?? null,
    };
  }, [exam, subject.name, year]);

  const loadMore = useCallback(
    async (cursor: string, attemptId: string): Promise<ExamPage> => {
      const page = await fetchApi<PastPaperPageOut>(
        `/api/assessments/past-paper/${encodeURIComponent(attemptId)}/more`,
        { method: "POST", body: { subject: subject.name, cursor } },
      );
      return {
        questions: page.questions.map(toExamQuestion),
        nextCursor: page.nextCursor ?? null,
      };
    },
    [subject.name],
  );

  const resultHref = useCallback(
    (attemptId: string) => `/practice/results/${attemptId}`,
    [],
  );

  const session = useExamSession({
    sessionKey,
    generate,
    resultHref,
    loadMore,
    secondsPerExtraQuestion: SECONDS_PER_QUESTION,
  });

  return (
    <ExamSurface
      session={session}
      eyebrow={`${examLabel} ${year}`}
      backHref="/practice/past-questions"
      onExit={onExit}
      confirmTitle="Submit your paper?"
    />
  );
}
