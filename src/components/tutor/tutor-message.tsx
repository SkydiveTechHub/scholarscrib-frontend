"use client";

import { LuThumbsDown, LuThumbsUp } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { TutorAction, TutorMessage } from "@/lib/tutor/types";
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

export function TutorMessageView({
  message,
  streaming,
  isLast,
  onRate,
  onAction,
}: {
  message: TutorMessage;
  streaming: boolean;
  isLast: boolean;
  onRate: (id: string, rating: "up" | "down") => void;
  onAction: (action: TutorAction, label: string) => void;
}) {
  if (message.role === "student") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {message.text}
        </p>
      </div>
    );
  }

  const waiting = streaming && message.text === "";
  const finished = !streaming && message.text !== "";

  return (
    <div className="flex items-start gap-2.5">
      <AstraAvatar />
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
          {waiting ? (
            <span
              className="flex items-center gap-1 py-1"
              role="status"
              aria-label="Astra is typing"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted motion-safe:animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          ) : (
            <TutorMarkdown content={message.text} />
          )}
        </div>

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
              <>
                <button
                  type="button"
                  onClick={() =>
                    onAction("explain_differently", "Explain differently")
                  }
                  className="min-h-8 rounded-full border border-border px-3 text-xs font-semibold text-muted transition-colors hover:text-foreground"
                >
                  Explain differently
                </button>
                {message.suggested?.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onAction(action, SUGGESTION_LABELS[action])}
                    className="min-h-8 rounded-full border border-border px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                  >
                    {SUGGESTION_LABELS[action]}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
