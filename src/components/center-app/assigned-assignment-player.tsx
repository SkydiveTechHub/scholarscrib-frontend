"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { LuArrowLeft, LuEye, LuShare2 } from "react-icons/lu";
import { ExamSurface } from "@/components/assessment/exam-surface";
import {
  useExamSession,
  type ExamQuestion,
  type GeneratedExam,
} from "@/components/assessment/use-exam-session";
import { SharedWithBadge } from "@/components/center-app/shared-with-badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useAssignedAssignment,
  useStartAssignedAssignment,
} from "@/hooks/api/use-student-centers";
import { isApiError } from "@/lib/api/errors";
import type { QuestionOut, StartAssignmentOut } from "@/lib/api/types";
import {
  assignmentCenterName,
  assignmentTutorName,
  formatDue,
  slugifySubject,
  taskTypeLabel,
} from "@/lib/center-assignments";

function toExamQuestions(rows: QuestionOut[]): ExamQuestion[] {
  return rows.map((q, index) => {
    const options =
      q.options && !Array.isArray(q.options)
        ? (q.options as Record<string, string>)
        : null;
    return {
      id: q.id,
      questionNumber: q.questionNumber ?? index + 1,
      questionText: q.questionText,
      questionImageUrl: q.questionImageUrl ?? null,
      questionType: q.questionType ?? "OBJECTIVE",
      options,
      difficulty: q.difficulty ?? "",
      marks: q.marks ?? 1,
      examType: q.examType ?? "",
      examYear: q.examYear ?? null,
      passage: q.passage ?? null,
      instruction: q.instruction ?? null,
      subjectName: q.subjectName ?? undefined,
      subjectCode: q.subjectCode ?? undefined,
    };
  });
}

function toGeneratedExam(payload: StartAssignmentOut): GeneratedExam {
  return {
    attemptId: payload.attemptId!,
    title: payload.title,
    questions: toExamQuestions(payload.questions ?? []),
    timeLimitMinutes: payload.timeLimitMinutes ?? null,
    deadlineAt: payload.deadlineAt ?? undefined,
    resumed: Boolean(payload.resumed),
    nextCursor: payload.nextCursor ?? null,
  };
}

function lessonHrefFromAssignment(filters: {
  subjectSlug?: string | null;
  topicSlug?: string | null;
} | null | undefined): string | null {
  const subject = filters?.subjectSlug?.trim();
  const topic = filters?.topicSlug?.trim();
  if (!subject || !topic) return null;
  return `/classroom/${encodeURIComponent(slugifySubject(subject))}/${encodeURIComponent(topic)}`;
}

function AssignedExamSurface({
  assignmentId,
  payload,
  eyebrow,
  tutorName,
  centerName,
}: {
  assignmentId: string;
  payload: StartAssignmentOut;
  eyebrow: string;
  tutorName: string;
  centerName: string;
}) {
  const sessionKey = useMemo(
    () => `assigned:${assignmentId}:${payload.attemptId}`,
    [assignmentId, payload.attemptId],
  );

  const generate = useCallback(
    async () => toGeneratedExam(payload),
    [payload],
  );

  const session = useExamSession({
    sessionKey,
    generate,
    resultHref: (attemptId) => `/practice/results/${attemptId}`,
    defaultTimeLimitMinutes: payload.timeLimitMinutes ?? undefined,
  });

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 pt-3">
        <SharedWithBadge tutorName={tutorName} centerName={centerName} />
      </div>
      <ExamSurface
        session={session}
        eyebrow={eyebrow}
        backHref="/assigned"
        confirmTitle="Submit assignment?"
      />
    </div>
  );
}

export function AssignedAssignmentPlayer({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const detail = useAssignedAssignment(assignmentId);
  const start = useStartAssignedAssignment();
  const [started, setStarted] = useState<StartAssignmentOut | null>(null);
  const [error, setError] = useState("");

  const assignment = detail.data;
  const tutorName = assignment ? assignmentTutorName(assignment) : "Tutor";
  const centerName = assignment ? assignmentCenterName(assignment) : "Center";

  if (detail.isLoading) return <Spinner label="Loading assignment…" />;

  if (detail.isError || !assignment) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-10 text-center">
        <p className="text-sm text-muted">
          {isApiError(detail.error)
            ? detail.error.message
            : "This assignment is not available."}
        </p>
        <Link href="/assigned" className={buttonClass("secondary", "md")}>
          Back to Assigned
        </Link>
      </div>
    );
  }

  const isLesson = (assignment.taskType ?? "").toUpperCase() === "LESSON";
  const lessonHref = lessonHrefFromAssignment(assignment.settings?.filters);

  if (
    started &&
    !isLesson &&
    started.attemptId &&
    (started.questions?.length ?? 0) > 0
  ) {
    return (
      <AssignedExamSurface
        assignmentId={assignmentId}
        payload={started}
        eyebrow={taskTypeLabel(assignment.taskType)}
        tutorName={started.sharedWith?.tutorName || tutorName}
        centerName={started.sharedWith?.centerName || centerName}
      />
    );
  }

  async function begin() {
    setError("");
    try {
      const payload = await start.mutateAsync(assignmentId);
      if ((payload.taskType ?? "").toUpperCase() === "LESSON" || isLesson) {
        if (lessonHref) {
          window.location.href = lessonHref;
          return;
        }
        setError(
          "This lesson has no classroom link yet. Ask your tutor for the topic.",
        );
        return;
      }
      setStarted(payload);
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message || "Could not start this assignment."
          : "Could not start this assignment.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <Link
        href="/assigned"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        <LuArrowLeft className="h-4 w-4" /> Assigned
      </Link>

      <div className="space-y-2">
        <SharedWithBadge tutorName={tutorName} centerName={centerName} />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {assignment.title || "Assignment"}
        </h1>
        <p className="text-sm text-muted">
          {taskTypeLabel(assignment.taskType)}
          {" · Due "}
          {formatDue(assignment.dueAt)}
        </p>
      </div>

      {(assignment.settings?.instructions ||
        started?.settings?.instructions) && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">
          {assignment.settings?.instructions ||
            started?.settings?.instructions}
        </div>
      )}

      <div className="rounded-xl border border-tone-amber-line bg-tone-amber-soft p-4 text-sm text-tone-amber-ink">
        <p className="flex items-start gap-2 font-semibold">
          <LuEye className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Focus disclosure
        </p>
        <p className="mt-1.5 leading-relaxed">
          If you leave this tab during the attempt, a neutral away-events flag
          may be shown to your tutor with the result. Stay on the exam when you
          can.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
        <p className="flex items-start gap-2 font-semibold text-foreground">
          <LuShare2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Shared with your tutor
        </p>
        <p className="mt-1.5 leading-relaxed">
          Your answers on this task feed your own learning record and are also
          visible to {tutorName} at {centerName}. Self-started practice stays
          private.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={start.isPending}
        onClick={begin}
      >
        {isLesson ? "Open lesson" : start.isPending ? "Starting…" : "Start"}
      </Button>
    </div>
  );
}
