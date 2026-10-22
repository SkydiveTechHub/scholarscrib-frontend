"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuCheck, LuCircleX, LuLoader } from "react-icons/lu";
import { useTutorChat } from "@/hooks/use-tutor-chat";
import { createBodyFor } from "@/lib/tutor/context";
import { ladderFor, startersFor, type Chip } from "@/lib/tutor/chips";
import { describeError, exhaustedMessage } from "@/lib/tutor/messages";
import { cn } from "@/lib/utils";
import type {
  ActiveRun,
  TutorContext,
  TutorErrorInfo,
  TutorMessage,
  TutorStep,
} from "@/lib/tutor/types";
import { useTutorStore } from "@/stores/tutor-store";
import { AstraAvatar } from "./astra-avatar";
import { TutorChips } from "./tutor-chips";
import { TutorComposer } from "./tutor-composer";
import { TutorMessageView, TypingBubble } from "./tutor-message";

export function TutorConversation({
  threadId,
  context,
  initialMessages,
  activeRun = null,
  systemBanner,
  onThreadStarted,
}: {
  threadId: string | null;
  context: TutorContext;
  initialMessages: TutorMessage[];
  activeRun?: ActiveRun | null;
  systemBanner?: string | null;
  onThreadStarted: (threadId: string) => void;
}) {
  const createBody = useMemo(() => createBodyFor(context), [context]);
  const { state, send, retry, stop, edit, rate, resolve } = useTutorChat({
    threadId,
    initialMessages,
    activeRun,
    createBody,
    onThreadStarted,
  });
  const [prefill, setPrefill] = useState<{
    text: string;
    nonce: number;
  } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const streaming = state.phase === "streaming";
  const pending = state.pendingAction != null;
  const rateLimited =
    state.error?.code === "RATE_LIMITED" ||
    (state.rateLimitedUntil != null && state.rateLimitedUntil > Date.now());
  const empty = state.messages.length === 0;
  const chips =
    ladderFor(context, state.hintsUsed) ?? (empty ? startersFor(context) : []);

  // "Explain this" arrives with a ready-made question. Take it once, on the
  // conversation it was meant for; a thread that already has messages is
  // resumed as-is rather than asked the same thing again.
  const sendRef = useRef(send);
  sendRef.current = send;
  const startedEmpty = useRef(initialMessages.length === 0);
  useEffect(() => {
    // Deferred so React's dev-only mount/unmount/mount cycle cancels the first
    // attempt instead of aborting a stream that has already started.
    const timer = setTimeout(() => {
      const { autoSend, clearAutoSend } = useTutorStore.getState();
      if (!autoSend) return;
      clearAutoSend();
      if (startedEmpty.current) sendRef.current(autoSend);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({
      block: "end",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [state.messages, state.phase, state.steps, state.reconnecting]);

  const pick = (chip: Chip) => send({ text: chip.text, action: chip.action });
  const lastIndex = state.messages.length - 1;
  // Until Astra's first word lands, show a typing bubble (a draft with text
  // draws its own message).
  const lastMessage = state.messages[lastIndex];
  const showTyping =
    streaming &&
    !state.resuming &&
    !state.reconnecting &&
    !(
      lastMessage?.role === "astra" &&
      (lastMessage.text !== "" ||
        lastMessage.actionProposal ||
        (lastMessage.tools?.length ?? 0) > 0 ||
        (lastMessage.blocks?.length ?? 0) > 0)
    );

  return (
    <>
      <div
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-busy={streaming}
      >
        {systemBanner && (
          <p
            role="status"
            className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs text-muted"
          >
            {systemBanner}
          </p>
        )}
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
            resolving={state.resuming}
            onRate={rate}
            onResolve={
              m.actionProposal
                ? (approved, args) => resolve(approved, args)
                : undefined
            }
            onChoose={
              !streaming && !pending
                ? (text) => send({ text, action: null })
                : undefined
            }
            onEdit={
              !streaming && m.stopped && m.role === "student"
                ? () => {
                    const text = edit(m.id);
                    if (text != null)
                      setPrefill({ text, nonce: Date.now() });
                  }
                : undefined
            }
            onAction={(action, label) => send({ text: label, action })}
          />
        ))}

        {showTyping && <TypingBubble />}

        {state.reconnecting && (
          <p role="status" className="px-1 text-xs text-muted">
            Reconnecting…
          </p>
        )}
        {streaming && state.steps.length > 0 && <StepList steps={state.steps} />}

        {state.phase === "error" && state.error && (
          <ErrorNotice error={state.error} onRetry={retry} />
        )}
        {rateLimited && state.phase !== "error" && (
          <p
            role="status"
            className="rounded-xl border border-border bg-secondary px-3.5 py-3 text-sm text-foreground"
          >
            {exhaustedMessage(state.error?.resetsAt, new Date())}
          </p>
        )}
        <div ref={endRef} />
      </div>

      {chips.length > 0 && !streaming && !rateLimited && !pending && (
        <TutorChips chips={chips} onPick={pick} />
      )}

      <TutorComposer
        streaming={streaming && !state.resuming}
        disabled={rateLimited || pending || state.resuming}
        placeholder={
          pending ? "Approve or dismiss the suggestion above" : undefined
        }
        prefill={prefill}
        onSend={(text) => send({ text, action: null })}
        onStop={stop}
      />
    </>
  );
}

function StepList({ steps }: { steps: TutorStep[] }) {
  return (
    <ol className="space-y-1 px-1" aria-label="Astra's progress">
      {steps.map((step) => (
        <li key={step.id} className="flex items-center gap-2 text-xs text-muted">
          {step.phase === "done" ? (
            <LuCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          ) : step.phase === "failed" ? (
            <LuCircleX className="h-3.5 w-3.5 text-danger" aria-hidden />
          ) : (
            <LuLoader
              className="h-3.5 w-3.5 text-primary motion-safe:animate-spin"
              aria-hidden
            />
          )}
          <span className={cn(step.phase === "active" && "text-foreground")}>
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ErrorNotice({
  error,
  onRetry,
}: {
  error: TutorErrorInfo;
  onRetry: () => void;
}) {
  const view = describeError(error, new Date());
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-foreground"
    >
      <p>{view.message}</p>
      {view.retry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 min-h-11 font-bold text-primary"
        >
          Try again
        </button>
      )}
      {view.upgrade && (
        <Link
          href="/settings/billing"
          className="mt-2 inline-flex min-h-11 items-center font-bold text-primary"
        >
          See Premium
        </Link>
      )}
    </div>
  );
}
