"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api/client";
import {
  ExamSurface,
  type QuestionGroup,
} from "@/components/assessment/exam-surface";
import {
  useExamSession,
  type GeneratedExam,
} from "@/components/assessment/use-exam-session";
import { JAMB_SPEC } from "@/lib/jamb-cbt";
import type { QuizOut } from "@/lib/api/types";
import { toExamQuestion } from "@/lib/past-question-exam";

function JambCbtSession() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year") ?? "";
  const subjectIds = searchParams.get("subjects") ?? "";

  // Distinct per paper, so two different sittings never share a saved session.
  const sessionKey = useMemo(
    () => ["jamb-cbt", year, subjectIds].join(":"),
    [year, subjectIds],
  );

  const generate = useCallback(async (): Promise<GeneratedExam> => {
    const paper = await fetchApi<QuizOut>("/api/assessments/jamb-cbt/generate", {
      method: "POST",
      body: {
        subjectIds: subjectIds.split(",").filter(Boolean),
        examYear: Number(year),
      },
    });
    // Shaped like every other paper: cleaned options, passages and group
    // instructions attached, and each question kept under its subject.
    return {
      attemptId: paper.attemptId,
      title: paper.title,
      questions: paper.questions.map(toExamQuestion),
      timeLimitMinutes: paper.timeLimitMinutes ?? null,
      deadlineAt: paper.deadlineAt ?? undefined,
      resumed: paper.resumed ?? undefined,
    };
  }, [subjectIds, year]);

  const toResult = useCallback(
    (attemptId: string) => `/practice/results/${attemptId}`,
    [],
  );

  const session = useExamSession({
    sessionKey,
    generate,
    resultHref: toResult,
    defaultTimeLimitMinutes: JAMB_SPEC.durationMinutes,
  });

  // The real CBT lets candidates move between their four papers freely.
  const groups = useMemo<QuestionGroup[]>(() => {
    const byKey = new Map<string, QuestionGroup>();
    for (const q of session.questions) {
      const key = q.subjectCode || q.subjectName || "";
      if (!key) continue;
      let group = byKey.get(key);
      if (!group) {
        group = { key, label: q.subjectName || key, questionIds: [] };
        byKey.set(key, group);
      }
      group.questionIds.push(q.id);
    }
    return [...byKey.values()];
  }, [session.questions]);

  const perSubject =
    groups.length > 1 ? (
      <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted">
        {groups.map((group) => (
          <p key={group.key}>
            {group.label}:{" "}
            {group.questionIds.filter((id) => session.isAnswered(id)).length}/
            {group.questionIds.length}
          </p>
        ))}
      </div>
    ) : null;

  return (
    <ExamSurface
      session={session}
      eyebrow={session.currentQuestion?.subjectName || `JAMB ${year}`}
      groups={groups}
      backHref="/practice/cbt"
      confirmTitle="Submit your UTME paper?"
      confirmExtra={perSubject}
    />
  );
}

export default function JambCbtSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        </div>
      }
    >
      <JambCbtSession />
    </Suspense>
  );
}
