"use client";

import { useEffect, useRef } from "react";
import { useTutorChat } from "@/hooks/use-tutor-chat";
import { ladderFor, startersFor, type Chip } from "@/lib/tutor/chips";
import type {
  TutorContext,
  TutorMessage,
  TutorStatus,
} from "@/lib/tutor/types";
import { AstraAvatar } from "./astra-avatar";
import { TutorChips } from "./tutor-chips";
import { TutorComposer } from "./tutor-composer";
import { TutorMessageView } from "./tutor-message";

function resetLabel(iso: string | null | undefined): string {
  if (!iso) return "tomorrow";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TutorConversation({
  threadId,
  context,
  initialMessages,
  status,
}: {
  threadId: string;
  context: TutorContext;
  initialMessages: TutorMessage[];
  status: TutorStatus;
}) {
  const { state, send, retry, stop, rate } = useTutorChat({
    threadId,
    context,
    initialMessages,
  });
  const endRef = useRef<HTMLDivElement>(null);
  const streaming = state.phase === "streaming";
  const remaining = state.remainingToday ?? status.remainingToday;
  const exhausted = remaining <= 0 || state.error?.code === "RATE_LIMITED";
  const empty = state.messages.length === 0;
  const chips =
    ladderFor(context, state.hintsUsed) ?? (empty ? startersFor(context) : []);

  // Follow the reply as it grows; reduced-motion users get an instant jump.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({
      block: "end",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [state.messages, state.phase]);

  const pick = (chip: Chip) => send({ text: chip.text, action: chip.action });
  const lastIndex = state.messages.length - 1;

  return (
    <>
      <div
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-busy={streaming}
      >
        {empty && (
          <div className="flex items-start gap-2.5">
            <AstraAvatar />
            <p className="rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
              Hi! Stuck on something? Pick one below or ask me anything.
            </p>
          </div>
        )}
        {state.messages.map((m, i) => (
          <TutorMessageView
            key={m.id}
            message={m}
            streaming={streaming && i === lastIndex && m.role === "astra"}
            isLast={i === lastIndex}
            onRate={rate}
            onAction={(action, label) => send({ text: label, action })}
          />
        ))}

        {state.phase === "error" && state.error && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-foreground"
          >
            {state.error.code === "RATE_LIMITED" ? (
              <p>
                You&apos;ve used today&apos;s questions. Astra is back at{" "}
                {resetLabel(state.error.resetsAt)}.
              </p>
            ) : (
              <>
                <p>{state.error.message}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-2 min-h-11 font-bold text-primary"
                >
                  Try again
                </button>
              </>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {chips.length > 0 && !streaming && !exhausted && (
        <TutorChips chips={chips} onPick={pick} />
      )}

      {remaining > 0 && remaining <= 3 && !exhausted && (
        <p className="px-4 pb-2 text-xs text-muted">
          {remaining} question{remaining === 1 ? "" : "s"} left today
        </p>
      )}

      <TutorComposer
        streaming={streaming}
        disabled={exhausted}
        onSend={(text) => send({ text, action: null })}
        onStop={stop}
      />
    </>
  );
}
