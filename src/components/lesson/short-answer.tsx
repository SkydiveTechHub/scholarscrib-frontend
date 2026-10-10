"use client";

import { useState } from "react";
import { LuCheck, LuEye, LuPencilLine, LuRotateCcw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import type { ShortBlock } from "@/lib/lesson-engine";
import { InlineMarkdown, Markdown } from "./markdown";

// A theory question: type your answer, reveal the model answer, then mark
// yourself. There is no auto-grading — free text cannot be marked reliably, and
// a wrong auto-mark on a correct answer would teach students to distrust the
// lesson. Typing first is the point: it forces recall before the answer is seen.
//
// Reports through the same `(attempts, correct)` channel a KnowledgeCheck uses,
// so progress, mastery and the player's gating treat both alike: "I got it" is a
// first-try result, "Not yet" is a result that needed more than one go.

type ShortAnswerProps = {
  block: ShortBlock;
  onResult: (attempts: number, correct: boolean) => void;
};

export function ShortAnswer({ block, onResult }: ShortAnswerProps) {
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(false);
  const [marked, setMarked] = useState<"got" | "not-yet" | null>(null);

  function mark(result: "got" | "not-yet") {
    if (marked) return;
    setMarked(result);
    onResult(result === "got" ? 1 : 2, true);
  }

  const inputId = `short-${block.id}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3">
        <LuPencilLine className="h-4 w-4 flex-shrink-0 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wide text-foreground">
          Write your answer
        </p>
        {marked && (
          <span
            className={
              marked === "got"
                ? "ml-auto rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-bold text-success"
                : "ml-auto rounded-full bg-tone-amber-soft px-2.5 py-0.5 text-[11px] font-bold text-warning"
            }
          >
            {marked === "got" ? "Got it" : "Review this one"}
          </span>
        )}
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
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          readOnly={shown}
          rows={3}
          maxLength={1000}
          placeholder="Type your answer in your own words…"
          className="mt-3 w-full resize-y rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 read-only:bg-secondary/40"
        />

        {!shown && (
          <div className="mt-3">
            <Button
              size="sm"
              onClick={() => setShown(true)}
              disabled={!typed.trim()}
            >
              <LuEye className="h-4 w-4" />
              Show model answer
            </Button>
            {!typed.trim() && (
              <p className="mt-2 text-xs text-muted">
                Write something first — recalling it is what makes it stick.
              </p>
            )}
          </div>
        )}

        <div aria-live="polite">
          {shown && (
            <div className="mt-4 animate-fade-in space-y-3">
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

              {!marked && (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    How did your answer compare?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="success" size="sm" onClick={() => mark("got")}>
                      <LuCheck className="h-4 w-4" />
                      I got it
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => mark("not-yet")}
                    >
                      <LuRotateCcw className="h-4 w-4" />
                      Not yet
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
