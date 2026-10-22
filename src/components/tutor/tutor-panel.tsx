"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  LuArrowLeft,
  LuHistory,
  LuMaximize2,
  LuMinimize2,
  LuSquarePen,
  LuX,
} from "react-icons/lu";
import {
  useRememberStartedThread,
  useResumeTutorThread,
  useTutorThread,
} from "@/hooks/api/use-tutor";
import { isApiError } from "@/lib/api/errors";
import { contextKey } from "@/lib/tutor/context";
import { trapTarget } from "@/lib/tutor/focus-trap";
import { can, type SubscriptionTier } from "@/lib/subscription";
import type { TutorThread } from "@/lib/tutor/types";
import { selectActiveEntry, useTutorStore } from "@/stores/tutor-store";
import { cn } from "@/lib/utils";
import { AstraAvatar } from "./astra-avatar";
import { TutorConversation } from "./tutor-conversation";
import { TutorHistory } from "./tutor-history";
import { TutorLocked } from "./tutor-locked";

const FOCUSABLE =
  'button, [href], textarea, input, [tabindex]:not([tabindex="-1"])';

// Docked beside the page (non-modal) only where the page still has room next
// to the sidebar; below this the panel is a modal sheet/drawer over the page.
// Keep in step with min-[1440px] here and in tutor-shell.
const DOCKED = "(min-width: 1440px)";

function useIsDocked(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(DOCKED);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(DOCKED).matches,
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
  const key = contextKey(entry.context);
  const resume = useResumeTutorThread(key);
  const onThreadStarted = useRememberStartedThread(entry.context);
  const forgetThread = useTutorStore((s) => s.forgetThread);
  const currentThreadId = useTutorStore((s) => s.threadIds[key] ?? null);
  // A thread the student picked (from history), or a blank "New chat", wins
  // over the context's own thread. It is local state, not a cache write, so
  // switching can't race the thread query. It only applies to the context it
  // was picked in. `draft` keys a blank chat so a second "New chat" resets it.
  const [picked, setPicked] = useState<{
    key: string;
    thread: TutorThread | null;
    draft: number;
  } | null>(null);
  const pickedHere = picked && picked.key === key ? picked : null;
  const active = pickedHere ? pickedHere.thread : (thread.data ?? null);
  // A new conversation has no thread yet; it is created on the first send.
  const conversationKey =
    active?.threadId ?? `new:${key}:${pickedHere?.draft ?? 0}`;
  const switchError = resume.isError;

  const docked = useIsDocked();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // A plan review dialog is portalled outside this panel. Leave its keys alone.
      const nested = Array.from(
        document.querySelectorAll("[role=dialog][aria-modal=true]"),
      ).some((el) => el !== ref.current && !ref.current?.contains(el));
      if (nested) return;
      if (e.key === "Escape") closePanel();
      if (e.key !== "Tab" || docked || !ref.current) return;
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
  }, [closePanel, docked]);

  useEffect(() => {
    if (docked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [docked]);

  useEffect(() => {
    ref.current?.focus();
    return () => {
      document.querySelector<HTMLElement>("[data-astra-trigger]")?.focus();
    };
  }, []);

  // Picking a context elsewhere (e.g. "Explain this") should land on the chat.
  useEffect(() => setView("chat"), [key]);

  const switching = resume.isPending;

  function open(thread: TutorThread) {
    setPicked({ key, thread, draft: 0 });
    setView("chat");
  }

  // Nothing is registered until the student sends a message. Forgetting the
  // old thread means closing and reopening comes back to this blank chat.
  function startNew() {
    forgetThread(key);
    setPicked({ key, thread: null, draft: Date.now() });
    setView("chat");
  }

  const showContext = entry.context.type !== "general" && entry.label;
  const err = thread.error;
  const forbidden = isApiError(err) && err.isForbidden;
  const unavailable =
    isApiError(err) && (err.status === 503 || err.status === 502);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 min-[1440px]:hidden"
        onClick={closePanel}
        aria-hidden
      />
      <aside
        ref={ref}
        role="dialog"
        aria-modal={!docked}
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
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <AstraAvatar className="mr-1 h-9 w-9 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold leading-tight text-foreground">
              Astra
            </h2>
            <p className="truncate text-xs text-muted">Your study buddy</p>
          </div>
          {entitled && !forbidden && (
            <>
              <button
                type="button"
                onClick={startNew}
                disabled={switching}
                aria-label="New chat"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted hover:bg-secondary"
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
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted hover:bg-secondary"
              >
                {view === "history" ? (
                  <LuArrowLeft className="h-4 w-4" />
                ) : (
                  <LuHistory className="h-4 w-4" />
                )}
              </button>
            </>
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
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted hover:bg-secondary"
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
            currentThreadId={currentThreadId}
            resumingId={resume.isPending ? (resume.variables ?? null) : null}
            failed={switchError}
            onResume={(id) => resume.mutate(id, { onSuccess: open })}
            onNew={startNew}
          />
        ) : pickedHere || thread.isSuccess ? (
          <TutorConversation
            key={conversationKey}
            threadId={active?.threadId ?? null}
            context={entry.context}
            initialMessages={active?.messages ?? []}
            activeRun={active?.activeRun ?? null}
            onThreadStarted={onThreadStarted}
            systemBanner={
              active?.systemBanner ??
              (entry.context.type === "question" &&
              entry.context.wrongAnswerContext
                ? `Reviewing your answer: ${entry.context.wrongAnswerContext}`
                : null)
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
        ) : (
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
        )}
      </aside>
    </>
  );
}
