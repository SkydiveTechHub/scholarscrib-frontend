"use client";

import { useState } from "react";
import { LuTarget } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { useRecordTopicAnswers } from "@/hooks/api/use-topic-answers";
import {
  QuickQuizModal,
  type QuickQuizResult,
  type QuizQuestion,
} from "./quick-quiz-modal";

// The lesson's own questions as a self-check: a button, the modal it opens, and
// the score line after. It owns its state so it can sit wherever the page wants
// it (the end of the lesson, or the practise row) without either caring how the
// quiz works.

export function QuickQuiz({
  subjectSlug,
  topicSlug,
  checks,
  variant = "outline",
  size = "md",
}: {
  subjectSlug: string;
  topicSlug: string;
  /** The lesson note's own questions; nothing renders when it has none. */
  checks: QuizQuestion[];
  variant?: "primary" | "outline";
  size?: "md" | "lg";
}) {
  const { mutate: recordAnswers } = useRecordTopicAnswers();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<QuickQuizResult | null>(null);

  if (checks.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass(variant, size)}
      >
        <LuTarget className="h-4 w-4" />
        Quick quiz
      </button>
      {result && (
        <p
          className="basis-full text-sm font-medium text-foreground"
          role="status"
        >
          Quick quiz: {result.correct} of {result.total} correct.
        </p>
      )}
      <QuickQuizModal
        open={open}
        checks={checks}
        onCancel={() => setOpen(false)}
        onSubmit={(submitted) => {
          setResult(submitted);
          setOpen(false);
          // Counts towards mastery. A failed save stays silent: the score is
          // already on screen and the quiz is a self-check.
          recordAnswers({
            subjectSlug,
            topicSlug,
            answers: submitted.answers,
          });
        }}
      />
    </>
  );
}
