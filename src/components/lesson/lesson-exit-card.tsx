"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuArrowRight, LuCircleCheck, LuClock } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EXIT_COOLDOWN_MS } from "@/lib/lesson-engine";
import { PRACTICE_TEST_ENABLED } from "@/lib/classroom";
import { QuickQuiz } from "@/components/classroom/quick-quiz";
import type { QuizQuestion } from "@/components/classroom/quick-quiz-modal";

// The end of the lesson. With the practice test on, this is the one place it is
// offered, worded for where the student is; the server enforces the rules (pass
// mark, cooldown) and this only reports them. While the test is switched off the
// lesson ends on the quick quiz instead.

type Attempt = { passed: boolean; percentage: number; at: string };

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function LessonExitCard(props: {
  subjectSlug: string;
  topicSlug: string;
  completed: boolean;
  lastAttempt: Attempt | null;
  passMarkPercent: number;
  practiceCount: number;
  /** The lesson note's own questions, for the quick quiz. */
  checks: QuizQuestion[];
}) {
  if (!PRACTICE_TEST_ENABLED) {
    return (
      <QuizEndCard
        subjectSlug={props.subjectSlug}
        topicSlug={props.topicSlug}
        checks={props.checks}
      />
    );
  }
  return <PracticeExitCard {...props} />;
}

function QuizEndCard({
  subjectSlug,
  topicSlug,
  checks,
}: {
  subjectSlug: string;
  topicSlug: string;
  checks: QuizQuestion[];
}) {
  if (checks.length === 0) return null;
  return (
    <div className="card flex flex-col items-center px-6 py-8 text-center">
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        Check what you&apos;ve learned
      </h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        A short quiz on this lesson. It&apos;s untimed, and it counts towards your
        mastery of the topic.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <QuickQuiz
          subjectSlug={subjectSlug}
          topicSlug={topicSlug}
          checks={checks}
          variant="primary"
        />
      </div>
    </div>
  );
}

function PracticeExitCard({
  subjectSlug,
  topicSlug,
  completed,
  lastAttempt,
  passMarkPercent,
  practiceCount,
}: {
  subjectSlug: string;
  topicSlug: string;
  completed: boolean;
  lastAttempt: Attempt | null;
  passMarkPercent: number;
  practiceCount: number;
}) {
  const practiceHref = `/classroom/${subjectSlug}/${topicSlug}/practice`;

  // A failed attempt blocks a retry for a while. Time is read in an effect so
  // the first render matches the server's.
  const failedAt =
    lastAttempt && !lastAttempt.passed ? new Date(lastAttempt.at).getTime() : null;
  const retryAt =
    failedAt !== null && Number.isFinite(failedAt)
      ? new Date(failedAt + EXIT_COOLDOWN_MS)
      : null;
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!retryAt) return;
    const check = () => setWaiting(retryAt.getTime() > Date.now());
    const first = window.setTimeout(check, 0);
    const interval = window.setInterval(check, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [retryAt?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const facts =
    practiceCount > 0
      ? `${practiceCount} questions · 90 seconds each · pass mark ${passMarkPercent}%`
      : `Pass mark ${passMarkPercent}%`;

  if (waiting && retryAt) {
    return (
      <div className="card flex flex-col items-center px-6 py-8 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-warning-soft text-warning">
          <LuClock className="h-6 w-6" />
        </span>
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Review, then try again
        </h2>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
          You scored {Math.round(lastAttempt?.percentage ?? 0)}%. The test opens
          again at {formatTime(retryAt)}. Use the time to go back over the
          sections you found hard.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a href="#lesson-top" className={buttonClass("primary", "md")}>
            Review the lesson
          </a>
          <span
            aria-disabled
            className={cn(buttonClass("outline", "md"), "pointer-events-none opacity-50")}
          >
            Retry at {formatTime(retryAt)}
          </span>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="card flex flex-col items-center px-6 py-8 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success">
          <LuCircleCheck className="h-6 w-6" />
        </span>
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          You&apos;ve completed this lesson
        </h2>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
          Keep it fresh with flashcards, or sit the test again to raise your
          score. Your best recent result counts.
        </p>
        <Link
          href={practiceHref}
          className={cn(buttonClass("outline", "md"), "mt-5")}
        >
          Retake the practice test
          <LuArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-xs font-medium text-muted">{facts}</p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col items-center px-6 py-8 text-center">
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        Now prove it
      </h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        One timed test stands between you and a completed lesson.
      </p>
      <Link
        href={practiceHref}
        className={cn(buttonClass("success", "md"), "mt-5")}
      >
        Take the practice test
        <LuArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-4 text-xs font-medium text-muted">{facts}</p>
    </div>
  );
}
