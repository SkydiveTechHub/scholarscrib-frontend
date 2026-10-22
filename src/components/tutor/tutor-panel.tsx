"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  LuArrowLeft,
  LuHistory,
  LuMaximize2,
  LuMinimize2,
  LuSquarePen,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import {
  useClearTutorThread,
  useNewTutorThread,
  useResumeTutorThread,
  useTutorThread,
} from "@/hooks/api/use-tutor";
import { isApiError } from "@/lib/api/errors";
import { contextKey } from "@/lib/tutor/context";
import { trapTarget } from "@/lib/tutor/focus-trap";
import { can, type SubscriptionTier } from "@/lib/subscription";
import { selectActiveEntry, useTutorStore } from "@/stores/tutor-store";
import { cn } from "@/lib/utils";
import { AstraAvatar } from "./astra-avatar";
import { TutorConversation } from "./tutor-conversation";
import { TutorHistory } from "./tutor-history";
import { TutorLocked } from "./tutor-locked";

const FOCUSABLE =
  'button, [href], textarea, input, [tabindex]:not([tabindex="-1"])';

const DESKTOP = "(min-width: 1024px)";

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

// Default export: loaded through next/dynamic from tutor-shell.
export default function TutorPanel({ tier }: { tier: SubscriptionTier }) {
  const entry = useTutorStore(selectActiveEntry);
  const closePanel = useTutorStore((s) => s.closePanel);
  const detach = useTutorStore((s) => s.detach);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const ref = useRef<HTMLElement>(null);

  const entitled = can(tier, "aiTutor");
  const thread = useTutorThread(entry.context, entitled);
  const clearThread = useClearTutorThread();
  const key = contextKey(entry.context);
  const resume = useResumeTutorThread(key);
  const startNew = useNewTutorThread(entry.context);

  const desktop = useIsDesktop();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
      if (e.key !== "Tab" || desktop || !ref.current) return;
      const nodes = Array.from(
        ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((n) => !n.hasAttribute("disabled"));
      const target = trapTarget(nodes, document.activeElement, ref.current, e.shiftKey);
      if (target) {
        e.preventDefault();
        target.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closePanel, desktop]);

  useEffect(() => {
    if (desktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [desktop]);

  useEffect(() => {
    ref.current?.focus();
    return () => {
      document.querySelector<HTMLElement>("[data-astra-trigger]")?.focus();
    };
  }, []);

  // Picking a context elsewhere (e.g. "Explain this") should land on the chat.
  useEffect(() => setView("chat"), [key]);

  const switching = resume.isPending || startNew.isPending;

  const showContext = entry.context.type !== "general" && entry.label;
  const err = thread.error;
  const forbidden = isApiError(err) && err.isForbidden;
  const unavailable =
    isApiError(err) && (err.status === 503 || err.status === 502);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={closePanel}
        aria-hidden
      />
      <aside
        ref={ref}
        role="dialog"
        aria-modal={!desktop}
        aria-label="Astra, your study buddy"
        tabIndex={-1}
        className={cn(
          "fixed z-50 flex flex-col bg-card shadow-xl outline-none",
          "inset-x-0 bottom-0 rounded-t-2xl border-t border-border",
          expanded ? "h-[100dvh] rounded-none" : "h-[75dvh]",
          "lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[400px] lg:rounded-none lg:border-l lg:border-t-0",
        )}
      >
        <div
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-border lg:hidden"
          aria-hidden
        />
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <AstraAvatar className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold leading-tight text-foreground">
              Astra
            </h2>
            <p className="text-xs text-muted">Your study buddy</p>
          </div>
          {entitled && !forbidden && (
            <>
              <button
                type="button"
                onClick={() =>
                  startNew.mutate(undefined, {
                    onSuccess: () => setView("chat"),
                  })
                }
                disabled={switching}
                aria-label="New chat"
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-secondary"
              >
                <LuSquarePen className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setView((v) => (v === "history" ? "chat" : "history"))
                }
                aria-label={view === "history" ? "Back to chat" : "Chat history"}
                aria-pressed={view === "history"}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-secondary"
              >
                {view === "history" ? (
                  <LuArrowLeft className="h-4 w-4" />
                ) : (
                  <LuHistory className="h-4 w-4" />
                )}
              </button>
            </>
          )}
          {thread.data && entitled && view === "chat" && (
            <button
              type="button"
              onClick={() =>
                clearThread.mutate({
                  threadId: thread.data.threadId,
                  contextKey: key,
                })
              }
              disabled={clearThread.isPending}
              aria-label="Clear chat"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-secondary"
            >
              <LuTrash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Shrink" : "Expand"}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-secondary lg:hidden"
          >
            {expanded ? (
              <LuMinimize2 className="h-4 w-4" />
            ) : (
              <LuMaximize2 className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close Astra"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-secondary"
          >
            <LuX className="h-5 w-5" />
          </button>
        </header>

        {showContext && (
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <span className="min-w-0 flex-1 truncate rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-foreground">
              {entry.label}
            </span>
            <button
              type="button"
              onClick={detach}
              aria-label="Stop using this as context"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-secondary"
            >
              <LuX className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!entitled || forbidden ? (
          <div className="flex-1 overflow-y-auto">
            <TutorLocked />
          </div>
        ) : view === "history" ? (
          <TutorHistory
            currentThreadId={thread.data?.threadId ?? null}
            resumingId={resume.isPending ? (resume.variables ?? null) : null}
            onResume={(id) =>
              resume.mutate(id, { onSuccess: () => setView("chat") })
            }
            onNew={() =>
              startNew.mutate(undefined, { onSuccess: () => setView("chat") })
            }
          />
        ) : thread.isPending ? (
          <div className="flex-1 p-4 text-sm text-muted" role="status">
            Getting Astra ready…
          </div>
        ) : unavailable ? (
          <div className="flex-1 p-4 text-sm text-foreground" role="status">
            <p>Astra is offline right now. Please try again later.</p>
          </div>
        ) : thread.isError || !thread.data ? (
          <div className="flex-1 p-4 text-sm text-foreground" role="alert">
            Couldn&apos;t reach Astra.{" "}
            <button
              type="button"
              onClick={() => void thread.refetch()}
              className="min-h-11 font-bold text-primary"
            >
              Try again
            </button>
            {forbidden && (
              <Link
                href="/settings/billing"
                className="mt-2 block min-h-11 font-bold text-primary"
              >
                See Premium
              </Link>
            )}
          </div>
        ) : (
          <TutorConversation
            key={thread.data.threadId}
            threadId={thread.data.threadId}
            context={entry.context}
            initialMessages={thread.data.messages}
            systemBanner={
              thread.data.systemBanner ??
              (entry.context.type === "question" &&
              entry.context.wrongAnswerContext
                ? `Reviewing your answer: ${entry.context.wrongAnswerContext}`
                : null)
            }
          />
        )}
      </aside>
    </>
  );
}
