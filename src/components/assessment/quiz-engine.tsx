"use client";

import { useCallback, useMemo } from "react";
import { useGenerateQuiz } from "@/hooks/api/use-assessments";
import { ExamSurface } from "./exam-surface";
import { useExamSession, type GeneratedExam } from "./use-exam-session";

type QuizEngineProps = {
  subjectSlug: string;
  topicSlug?: string;
  examType?: string;
  /** One sitting of a past paper, e.g. 2022. */
  examYear?: number;
  count?: number;
  backHref?: string;
  title?: string;
  resultHref?: (attemptId: string) => string;
  /** No countdown, no deadline — for short, low-stakes checks like the topic quick quiz. */
  untimed?: boolean;
  /**
   * Marks this quiz as a lesson's practice exit, so submitting it records the
   * lesson progress it earned. Only the exit sets this.
   */
  practiceExit?: { subjectSlug: string; topicSlug: string };
};

/**
 * Single-subject quiz: topic quizzes, past-question sets and lesson practice
 * exits. The session mechanics live in `useExamSession`, shared with the
 * multi-subject mock exam.
 */
export function QuizEngine({
  subjectSlug,
  topicSlug,
  examType = "",
  examYear,
  count = 10,
  backHref,
  title: titleOverride,
  resultHref,
  untimed = false,
  practiceExit,
}: QuizEngineProps) {
  const sessionKey = useMemo(
    () =>
      ["quiz", subjectSlug, topicSlug ?? "-", examType || "-", examYear ?? "-", count].join(
        ":",
      ),
    [subjectSlug, topicSlug, examType, examYear, count],
  );

  // mutateAsync is stable, so `generate` only changes with the quiz itself.
  const { mutateAsync: generateQuiz } = useGenerateQuiz();
  const generate = useCallback(async (): Promise<GeneratedExam> => {
    return generateQuiz({
      subjectSlug,
      ...(topicSlug ? { topicSlug } : {}),
      ...(examType ? { examType } : {}),
      ...(examYear !== undefined ? { examYear } : {}),
      ...(titleOverride ? { title: titleOverride } : {}),
      ...(untimed ? { untimed: true } : {}),
      count,
    });
  }, [generateQuiz, subjectSlug, topicSlug, examType, examYear, count, titleOverride, untimed]);

  const toResult = useCallback(
    (attemptId: string) =>
      resultHref ? resultHref(attemptId) : `/practice/results/${attemptId}`,
    [resultHref],
  );

  // Stable identity: the submit callback depends on this, and a fresh object
  // every render would rebuild it on every tick of the timer.
  const exitSubjectSlug = practiceExit?.subjectSlug;
  const exitTopicSlug = practiceExit?.topicSlug;
  const exitContext = useMemo(
    () =>
      exitSubjectSlug && exitTopicSlug
        ? { subjectSlug: exitSubjectSlug, topicSlug: exitTopicSlug }
        : undefined,
    [exitSubjectSlug, exitTopicSlug],
  );

  const session = useExamSession({
    sessionKey,
    generate,
    resultHref: toResult,
    defaultTimeLimitMinutes: untimed ? 0 : undefined,
    practiceExit: exitContext,
  });

  return (
    <ExamSurface
      session={session}
      eyebrow={examType || undefined}
      backHref={backHref}
      confirmTitle="Submit Quiz?"
    />
  );
}
