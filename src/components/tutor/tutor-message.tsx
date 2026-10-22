"use client";

import { LuPencil, LuThumbsDown, LuThumbsUp } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { GroundedOn, TutorAction, TutorMessage } from "@/lib/tutor/types";
import { useTutorStore } from "@/stores/tutor-store";
import { AstraAvatar } from "./astra-avatar";
import { TutorMarkdown } from "./tutor-markdown";

const SUGGESTION_LABELS: Record<TutorAction, string> = {
  explain_simply: "Explain simply",
  example: "Give an example",
  test_me: "Test me",
  hint_next: "Another hint",
  reveal: "Walk me through it",
  explain_differently: "Explain differently",
};

/** Three bouncing dots, like a chat app's "typing…". */
function TypingDots() {
  return (
    <span
      className="flex h-5 items-center gap-1"
      role="status"
      aria-label="Astra is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-muted motion-safe:animate-bounce motion-reduce:opacity-60"
          style={{ animationDelay: `${i * 160}ms`, animationDuration: "1s" }}
        />
      ))}
    </span>
  );
}

/** Standalone typing bubble, shown before Astra's first word arrives. */
export function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <AstraAvatar />
      <div className="rounded-2xl rounded-tl-md bg-secondary px-4 py-3">
        <TypingDots />
      </div>
    </div>
  );
}

export function TutorMessageView({
  message,
  streaming,
  isLast,
  onRate,
  onEdit,
  onAction,
}: {
  message: TutorMessage;
  streaming: boolean;
  isLast: boolean;
  onRate: (id: string, rating: "up" | "down") => void;
  /** Present only on a stopped prompt that can be pulled back into the composer. */
  onEdit?: () => void;
  onAction: (action: TutorAction, label: string) => void;
}) {
  if (message.role === "student") {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {message.text}
        </p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit message"
            className="flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-muted transition-colors hover:text-foreground"
          >
            <LuPencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>
    );
  }

  if (message.role === "system") return null;

  // An empty draft is covered by the conversation's typing bubble.
  if (streaming && message.text === "") return null;
  const finished = !streaming && message.text !== "" && !message.stopped;
  const sources = message.groundedOn?.filter(Boolean) ?? [];

  return (
    <div className="flex items-start gap-2.5">
      <AstraAvatar />
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
          <TutorMarkdown content={message.text} streaming={streaming} />
        </div>

        {message.stopped && (
          <p className="mt-1 px-1 text-xs text-muted">Stopped</p>
        )}

        {finished && sources.length > 0 && (
          <SourcesRow sources={sources} />
        )}

        {finished && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {(["up", "down"] as const).map((rating) => {
              const Icon = rating === "up" ? LuThumbsUp : LuThumbsDown;
              const active = message.rating === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onRate(message.id, rating)}
                  aria-label={rating === "up" ? "Helpful" : "Not helpful"}
                  aria-pressed={active}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-secondary hover:text-foreground",
                    active && "bg-primary-soft text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            {isLast && (
              <button
                type="button"
                onClick={() =>
                  onAction("explain_differently", "Explain differently")
                }
                className="min-h-8 rounded-full border border-border px-3 text-xs font-semibold text-muted transition-colors hover:text-foreground"
              >
                Explain differently
              </button>
            )}
            {isLast &&
              message.suggested?.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => onAction(action, SUGGESTION_LABELS[action])}
                  className="min-h-8 rounded-full border border-border px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                >
                  {SUGGESTION_LABELS[action]}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SourcesRow({ sources }: { sources: GroundedOn[] }) {
  const openPanel = useTutorStore((s) => s.openPanel);

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Sources">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Sources
      </span>
      {sources.map((src, i) => {
        const label = src.title?.trim() || src.sourceType || "Source";
        const title = src.excerpt?.trim() || label;
        const key = `${src.docId ?? src.lessonId ?? src.questionId ?? src.resourceId ?? i}-${label}`;

        if (src.sourceType === "question" && src.questionId) {
          return (
            <button
              key={key}
              type="button"
              title={title}
              onClick={() =>
                openPanel({
                  context: {
                    type: "question",
                    questionId: src.questionId!,
                    subjectId: src.subjectId,
                    topicId: src.topicId,
                  },
                  label,
                })
              }
              className="max-w-full truncate rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary-soft"
            >
              {label}
            </button>
          );
        }

        return (
          <span
            key={key}
            title={title}
            className="max-w-full truncate rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
