"use client";

import { LuClock } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { describeMinutes } from "@/lib/exam-duration";

/**
 * Shown before a timed exam is created, because creating it starts the clock.
 * The point is to get the student thinking about time before the first
 * question, not to ask permission.
 */
export function TimedExamDialog({
  minutes,
  questionCount,
  starting = false,
  onCancel,
  onStart,
}: {
  minutes: number;
  /** Omit when the paper's size isn't known up front. */
  questionCount?: number | null;
  starting?: boolean;
  onCancel: () => void;
  onStart: () => void;
}) {
  const perQuestion =
    questionCount && questionCount > 0
      ? Math.round((minutes * 60) / questionCount)
      : null;

  return (
    <Modal
      open
      title="This is a timed exam"
      onClose={onCancel}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={starting}>
            Not yet
          </Button>
          <Button onClick={onStart} disabled={starting}>
            {starting ? "Starting…" : "Start the clock"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-primary-soft px-4 py-3 text-primary">
          <LuClock className="h-6 w-6 flex-shrink-0" />
          <div>
            <p className="text-lg font-bold">{describeMinutes(minutes)}</p>
            <p className="text-xs font-semibold">
              {questionCount
                ? `for ${questionCount} questions`
                : "on the clock from the first question"}
            </p>
          </div>
        </div>

        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
          {perQuestion !== null && (
            <li>
              That is about {perQuestion} seconds a question. Don&apos;t stay
              on one for long.
            </li>
          )}
          <li>The clock starts as soon as you begin and can&apos;t be paused.</li>
          <li>
            You&apos;ll get a warning with 5 minutes left. When time runs out,
            your answers are submitted automatically.
          </li>
          <li>
            Leaving the exam, by switching pages or closing the tab, submits
            it with the answers you have so far.
          </li>
          <li>Skip or flag a hard question and come back to it.</li>
        </ul>

        <p className="text-sm text-muted">
          Find a quiet spot and settle in. Start when you&apos;re ready.
        </p>
      </div>
    </Modal>
  );
}
