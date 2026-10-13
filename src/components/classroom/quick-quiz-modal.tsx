"use client";

import { useMemo, useState } from "react";
import { LuCheck, LuPencilLine, LuRotateCcw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { InlineMarkdown, Markdown } from "@/components/lesson/markdown";
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
// question is revealed while the student is still answering it. Multiple choice
// is marked by the caller. Theory questions cannot be auto-marked, so Submit
// moves the student to a marking step: their typed answers beside the model
// answers, each marked by the student, and Finish records the lot. There is no
// separate "show the answer" button; submitting is what reveals it.

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
  const [typed, setTyped] = useState<Record<string, string>>({});
  // True once the student marks a theory answer "I got it".
  const [selfMarked, setSelfMarked] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<"answer" | "mark">("answer");

  const theory = useMemo(
    () => checks.filter((check): check is ShortBlock => check.type === "short"),
    [checks],
  );

  const answered = useMemo(
    () =>
      checks.filter((check) =>
        check.type === "short" ? typed[check.id]?.trim() : picked[check.id],
      ).length,
    [checks, picked, typed],
  );
  const complete = answered === checks.length;
  const marked = theory.filter((check) => check.id in selfMarked).length;
  const markingDone = marked === theory.length;

  // Reset on the way out, so reopening starts from a clean paper.
  function finish(action: () => void) {
    action();
    setPicked({});
    setTyped({});
    setSelfMarked({});
    setPhase("answer");
  }

  // Theory answers still need the student's own verdict, so with any present
  // the first Submit reveals them for marking; the second records the quiz.
  function submit() {
    if (phase === "answer" && theory.length > 0) {
      setPhase("mark");
      return;
    }
    record();
  }

  function record() {
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
      description={
        phase === "mark"
          ? "Compare your answers with the model answers, then mark yourself honestly."
          : `${checks.length} question${checks.length === 1 ? "" : "s"} from this lesson. ${answered} of ${checks.length} answered.`
      }
      className="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => finish(onCancel)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={phase === "mark" ? !markingDone : !complete}
          >
            <LuCheck className="h-4 w-4" />
            {phase === "mark" ? "Finish" : "Submit"}
          </Button>
        </div>
      }
    >
      {phase === "mark" ? (
        <ol className="space-y-6">
          {theory.map((check) => (
            <li key={check.id}>
              <TheoryMarking
                block={check}
                typed={typed[check.id] ?? ""}
                verdict={selfMarked[check.id]}
                onMark={(gotIt) =>
                  setSelfMarked((prev) => ({ ...prev, [check.id]: gotIt }))
                }
              />
            </li>
          ))}
        </ol>
      ) : (
      <ol className="space-y-6">
        {checks.map((check, index) =>
          check.type === "short" ? (
            <li key={check.id}>
              <TheoryInput
                number={index + 1}
                block={check}
                value={typed[check.id] ?? ""}
                onChange={(value) =>
                  setTyped((prev) => ({ ...prev, [check.id]: value }))
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
      )}
    </Modal>
  );
}

function TheoryInput({
  number,
  block,
  value,
  onChange,
}: {
  number: number;
  block: ShortBlock;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = `quiz-theory-${block.id}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3">
        <LuPencilLine className="h-4 w-4 flex-shrink-0 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wide text-foreground">
          {number}. Theory question
        </p>
      </div>
      <div className="p-4">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium leading-relaxed text-foreground"
        >
          <InlineMarkdown content={block.question} />
        </label>
        <textarea
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Type your answer in your own words…"
          className="mt-3 w-full resize-y rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
}

function TheoryMarking({
  block,
  typed,
  verdict,
  onMark,
}: {
  block: ShortBlock;
  typed: string;
  verdict: boolean | undefined;
  onMark: (gotIt: boolean) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-secondary/60 px-4 py-3">
        <p className="text-sm font-medium leading-relaxed text-foreground">
          <InlineMarkdown content={block.question} />
        </p>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-xl bg-secondary/40 px-3.5 py-3 text-sm leading-relaxed text-foreground/90">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-foreground/70">
            Your answer
          </p>
          <p className="whitespace-pre-wrap">{typed}</p>
        </div>
        <div className="rounded-xl bg-primary-soft/60 px-3.5 py-3 text-sm leading-relaxed text-foreground">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-foreground/70">
            Model answer
          </p>
          <Markdown content={block.answer} />
        </div>
        {block.explanation && (
          <div className="rounded-xl bg-secondary/50 px-3.5 py-3 text-sm leading-relaxed text-foreground/90">
            <Markdown content={block.explanation} />
          </div>
        )}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            How did your answer compare?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={verdict === true ? "success" : "outline"}
              size="sm"
              onClick={() => onMark(true)}
              aria-pressed={verdict === true}
            >
              <LuCheck className="h-4 w-4" />
              I got it
            </Button>
            <Button
              variant={verdict === false ? "primary" : "outline"}
              size="sm"
              onClick={() => onMark(false)}
              aria-pressed={verdict === false}
            >
              <LuRotateCcw className="h-4 w-4" />
              Not yet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
