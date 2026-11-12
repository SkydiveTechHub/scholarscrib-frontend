"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LuArrowLeft, LuCheck, LuCircleX, LuLoader, LuX } from "react-icons/lu";
import { StatusBanner } from "@/components/admin/status-banner";
import { CenterAstraComposer } from "@/components/center-app/center-astra-composer";
import { CenterAstraMessage } from "@/components/center-app/center-astra-message";
import { buttonClass } from "@/components/ui/button";
import { useCenterAstraChat } from "@/hooks/use-center-astra";
import { startersFor } from "@/lib/center-astra/starters";
import type { ActiveRun, AstraMessage, AstraStep } from "@/lib/center-astra/types";
import { cn } from "@/lib/utils";

const EMPTY =
  "Ask about assignment results, who is behind, or draft follow-up work for this center.";

export function CenterAstraChat({
  centerId,
  threadId,
  title,
  messages,
  activeRun,
  tokensEmpty,
  canTopUp,
  onTitle,
  onMissing,
  onBack,
  onTokensSpent,
  onClose,
}: {
  centerId: string;
  threadId: string;
  title: string | null;
  messages: AstraMessage[];
  activeRun: ActiveRun;
  tokensEmpty?: boolean;
  canTopUp?: boolean;
  onTitle: (title: string) => void;
  onMissing: () => void;
  onBack: () => void;
  onTokensSpent?: () => void;
  onClose?: () => void;
}) {
  const { state, send, resolve, stop, retry } = useCenterAstraChat({
    centerId,
    threadId,
    initialMessages: messages,
    activeRun,
    onTitle,
    onTokensSpent,
  });
  const endRef = useRef<HTMLDivElement>(null);
  const streaming = state.phase === "streaming";
  const pending = state.pendingAction != null;
  const starters =
    state.messages.length === 0 && !streaming && !tokensEmpty ? startersFor() : [];
  const tokenBlocked =
    tokensEmpty || state.error?.code === "TOKEN_BALANCE_EMPTY";

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
          className="rounded-lg p-1.5 text-muted hover:bg-secondary"
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
        {state.messages.length === 0 && !streaming && !tokenBlocked && (
          <p className="px-1 text-sm text-muted">{EMPTY}</p>
        )}
        {tokenBlocked && state.messages.length === 0 && (
          <ZeroTokenEmpty canTopUp={canTopUp} />
        )}
        {state.messages.map((message, index) =>
          visibleMessage(message) ? (
            <CenterAstraMessage
              key={message.id}
              message={message}
              streaming={
                streaming &&
                index === state.messages.length - 1 &&
                message.role === "assistant"
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
              state.error.code === "TOKEN_BALANCE_EMPTY" ? (
                canTopUp ? (
                  <Link
                    href="/center/billing#ai-tokens"
                    className="text-sm font-semibold underline"
                  >
                    Buy tokens
                  </Link>
                ) : (
                  <span className="text-sm">Ask the center owner to top up.</span>
                )
              ) : state.error.code === "UNAVAILABLE" ? (
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
      <CenterAstraComposer
        streaming={streaming && !state.resuming}
        disabled={pending || state.resuming || Boolean(tokensEmpty)}
        placeholder={
          tokensEmpty
            ? "Top up AI tokens to keep chatting"
            : pending
              ? "Approve or dismiss the draft first"
              : undefined
        }
        onSend={send}
        onStop={stop}
      />
    </div>
  );
}

function ZeroTokenEmpty({ canTopUp }: { canTopUp?: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-foreground">Out of AI tokens</p>
      <p className="mt-1 text-sm text-muted">
        Each Astra turn uses tokens from this center&apos;s pool. Top up to ask
        about results or draft follow-up work.
      </p>
      {canTopUp ? (
        <Link
          href="/center/billing#ai-tokens"
          className={cn(buttonClass("primary", "sm"), "mt-4 inline-flex")}
        >
          Buy token packs
        </Link>
      ) : (
        <p className="mt-3 text-sm text-muted">Ask the center owner to buy a pack.</p>
      )}
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
