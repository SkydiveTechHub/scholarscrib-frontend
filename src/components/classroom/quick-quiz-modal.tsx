"use client";

import { useMemo, useState } from "react";
import { LuCheck } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { InlineMarkdown } from "@/components/lesson/markdown";
import { ShortAnswer } from "@/components/lesson/short-answer";
import { cn } from "@/lib/utils";
import type { CheckBlock, ShortBlock } from "@/lib/lesson-engine";

/** A question in the quiz: multiple choice, or a typed answer the student self-marks. */
export type QuizQuestion = CheckBlock | ShortBlock;

export type QuickQuizResult = {
  correct: number;
  total: number;
  /** What the student picked, per question, for the caller to record. */
  answers: {
    questionId: string;
    /** Multiple choice: marked server-side against the stored answer. */
    selectedAnswer?: string;
    /** Short answer: the student's own verdict, true for "I got it". */
    firstTry?: boolean;
  }[];
};

// The lesson note's own practice questions, in a modal that only the two
// footer buttons can end: no close icon, Escape or backdrop click, so a student
// cannot lose half a quiz to a stray tap. Untimed; the caller records the answers
// as mastery evidence -- a self-check
// over what was just read.
//
// Answers are held until Submit and then marked together, so nothing about a
// question is revealed while the student is still answering it.

export function QuickQuizModal({
  open,
  checks,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  checks: QuizQuestion[];
  onCancel: () => void;
  onSubmit: (result: QuickQuizResult) => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  // Short answers settle themselves: true once the student marks "I got it".
  const [selfMarked, setSelfMarked] = useState<Record<string, boolean>>({});

  const answered = useMemo(
    () =>
      checks.filter((check) =>
        check.type === "short" ? check.id in selfMarked : picked[check.id],
      ).length,
    [checks, picked, selfMarked],
  );
  const complete = answered === checks.length;

  // Reset on the way out, so reopening starts from a clean paper.
  function finish(action: () => void) {
    action();
    setPicked({});
    setSelfMarked({});
  }

  function submit() {
    const correct = checks.filter((check) =>
      check.type === "short" ? selfMarked[check.id] : picked[check.id] === check.answer,
    ).length;
    const answers = checks.map((check) =>
      check.type === "short"
        ? { questionId: check.id, firstTry: selfMarked[check.id] }
        : { questionId: check.id, selectedAnswer: picked[check.id] },
    );
    finish(() => onSubmit({ correct, total: checks.length, answers }));
  }

  return (
    <Modal
      open={open}
      dismissible={false}
      onClose={() => {}}
      title="Quick quiz"
      description={`${checks.length} question${checks.length === 1 ? "" : "s"} from this lesson. ${answered} of ${checks.length} answered.`}
      className="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => finish(onCancel)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!complete}>
            <LuCheck className="h-4 w-4" />
            Submit
          </Button>
        </div>
      }
    >
      <ol className="space-y-6">
        {checks.map((check, index) =>
          check.type === "short" ? (
            <li key={check.id}>
              <p className="mb-2 text-xs font-semibold text-muted">
                {index + 1}. Theory question
              </p>
              <ShortAnswer
                block={check}
                onResult={(attempts) =>
                  setSelfMarked((prev) => ({ ...prev, [check.id]: attempts === 1 }))
                }
              />
            </li>
          ) : (
          <li key={check.id}>
            <p className="text-sm font-medium leading-relaxed text-foreground">
              <span className="mr-1.5 text-muted">{index + 1}.</span>
              <InlineMarkdown content={check.question} />
            </p>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label={`Question ${index + 1}`}>
              {Object.entries(check.options).map(([key, value]) => {
                const chosen = picked[check.id] === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    onClick={() => setPicked((prev) => ({ ...prev, [check.id]: key }))}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                      chosen
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        chosen ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                      )}
                    >
                      {key}
                    </span>
                    <span className="flex-1 leading-relaxed text-foreground/90">
                      <InlineMarkdown content={value} />
                    </span>
                  </button>
                );
              })}
            </div>
          </li>
          ),
        )}
      </ol>
    </Modal>
  );
}
