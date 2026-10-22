"use client";

import { useEffect, useRef } from "react";
import { LuArrowLeft, LuCheck, LuCircleX, LuLoader, LuX } from "react-icons/lu";
import { StatusBanner } from "@/components/admin/status-banner";
import { AdminAstraComposer } from "@/components/admin/astra/admin-astra-composer";
import { AdminAstraMessage } from "@/components/admin/astra/admin-astra-message";
import { useAdminAstraChat } from "@/hooks/use-admin-astra";
import { startersFor } from "@/lib/admin-astra/starters";
import type { ActiveRun, AstraMessage, AstraStep } from "@/lib/admin-astra/types";
import { cn } from "@/lib/utils";

const EMPTY = "Ask Astra to look up a student, a question, or the dashboard.";

export function AdminAstraChat({
  threadId,
  title,
  messages,
  activeRun,
  isOwner,
  onTitle,
  onMissing,
  onBack,
  compact = false,
  onClose,
}: {
  threadId: string;
  title: string | null;
  messages: AstraMessage[];
  activeRun: ActiveRun;
  isOwner: boolean;
  onTitle: (title: string) => void;
  onMissing: () => void;
  onBack: () => void;
  /** Stacked layout inside the floating panel, where the list is not beside the chat. */
  compact?: boolean;
  onClose?: () => void;
}) {
  const { state, send, resolve, stop, retry } = useAdminAstraChat({
    threadId,
    initialMessages: messages,
    activeRun,
    onTitle,
  });
  const endRef = useRef<HTMLDivElement>(null);
  const streaming = state.phase === "streaming";
  const pending = state.pendingAction != null;
  const starters = state.messages.length === 0 && !streaming ? startersFor(isOwner) : [];

  useEffect(() => {
    if (state.error?.code === "NOT_FOUND") onMissing();
  }, [onMissing, state.error]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [state.messages, state.phase, state.steps, state.reconnecting]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "rounded-lg p-1.5 text-muted hover:bg-secondary",
            !compact && "lg:hidden",
          )}
          aria-label="Back to chats"
        >
          <LuArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {title?.trim() || "New chat"}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Astra"
            className="rounded-lg p-1.5 text-muted hover:bg-secondary"
          >
            <LuX className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {state.messages.length === 0 && !streaming && (
          <p className="px-1 text-sm text-muted">{EMPTY}</p>
        )}
        {state.messages.map((message, index) =>
          visibleMessage(message) ? (
            <AdminAstraMessage
              key={message.id}
              message={message}
              streaming={
                streaming && index === state.messages.length - 1 && message.role === "assistant"
              }
              cardError={message.proposal ? state.cardError : null}
              resolving={state.resuming}
              onResolve={message.proposal ? resolve : undefined}
            />
          ) : null,
        )}
        {state.reconnecting && (
          <p role="status" className="px-1 text-xs text-muted">
            Reconnecting…
          </p>
        )}
        {streaming && state.steps.length > 0 && <StepList steps={state.steps} />}
        {state.phase === "error" && state.error && (
          <StatusBanner
            tone="error"
            title={state.error.message}
            action={
              state.error.code === "UNAVAILABLE" ? (
                <button type="button" onClick={retry} className="text-sm font-semibold underline">
                  Try again
                </button>
              ) : undefined
            }
          />
        )}
        <div ref={endRef} />
      </div>
      {starters.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {starters.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => send(starter)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary"
            >
              {starter}
            </button>
          ))}
        </div>
      )}
      <AdminAstraComposer
        streaming={streaming && !state.resuming}
        disabled={pending || state.resuming}
        placeholder={pending ? "Approve or dismiss the change first" : undefined}
        onSend={send}
        onStop={stop}
      />
    </div>
  );
}

function visibleMessage(message: AstraMessage): boolean {
  return (
    message.text !== "" ||
    (message.tools?.length ?? 0) > 0 ||
    message.proposal != null ||
    message.settled != null ||
    message.result !== undefined
  );
}

function StepList({ steps }: { steps: AstraStep[] }) {
  return (
    <ol className="space-y-1 px-1" aria-label="Astra progress">
      {steps.map((step) => (
        <li key={step.id} className="flex items-center gap-2 text-xs text-muted">
          {step.phase === "done" ? (
            <LuCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          ) : step.phase === "failed" ? (
            <LuCircleX className="h-3.5 w-3.5 text-danger" aria-hidden />
          ) : (
            <LuLoader className="h-3.5 w-3.5 text-primary motion-safe:animate-spin" aria-hidden />
          )}
          <span className={cn(step.phase === "active" && "text-foreground")}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
