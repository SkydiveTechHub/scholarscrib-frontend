"use client";

import { useEffect, useRef, useState } from "react";
import { LuMaximize2, LuMinimize2, LuX } from "react-icons/lu";
import { useTutorStatus, useTutorThread } from "@/hooks/api/use-tutor";
import { can, type SubscriptionTier } from "@/lib/subscription";
import { selectActiveEntry, useTutorStore } from "@/stores/tutor-store";
import { cn } from "@/lib/utils";
import { AstraAvatar } from "./astra-avatar";
import { TutorConversation } from "./tutor-conversation";
import { TutorLocked } from "./tutor-locked";

const FOCUSABLE =
  'button, [href], textarea, input, [tabindex]:not([tabindex="-1"])';

// Default export: loaded through next/dynamic from tutor-shell.
export default function TutorPanel({ tier }: { tier: SubscriptionTier }) {
  const entry = useTutorStore(selectActiveEntry);
  const closePanel = useTutorStore((s) => s.closePanel);
  const detach = useTutorStore((s) => s.detach);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const entitled = can(tier, "aiTutor");
  const status = useTutorStatus(entitled);
  const allowed = entitled && status.data?.allowed !== false;
  const thread = useTutorThread(entry.context, allowed);

  // Esc closes; on phones the sheet is modal, so Tab is kept inside it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
      const modal = !window.matchMedia("(min-width: 1024px)").matches;
      if (e.key !== "Tab" || !modal || !ref.current) return;
      const nodes = Array.from(
        ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((n) => !n.hasAttribute("disabled"));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closePanel]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("textarea, button")?.focus();
  }, []);

  const showContext = entry.context.type !== "general" && entry.label;

  return (
    <>
      {/* Phones only: the sheet is modal, the desktop dock is not. */}
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={closePanel}
        aria-hidden
      />
      <aside
        ref={ref}
        role="dialog"
        aria-label="Astra, your study buddy"
        className={cn(
          "fixed z-50 flex flex-col bg-card shadow-xl",
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

        {!allowed ? (
          <div className="flex-1 overflow-y-auto">
            {entitled && status.data?.reason ? (
              <p className="p-4 text-sm text-muted">{status.data.reason}</p>
            ) : (
              <TutorLocked />
            )}
          </div>
        ) : thread.isPending || status.isPending ? (
          <div className="flex-1 p-4 text-sm text-muted" role="status">
            Getting Astra ready…
          </div>
        ) : thread.isError || status.isError || !thread.data || !status.data ? (
          <div className="flex-1 p-4 text-sm text-foreground" role="alert">
            Couldn&apos;t reach Astra.{" "}
            <button
              type="button"
              onClick={() => {
                void thread.refetch();
                void status.refetch();
              }}
              className="min-h-11 font-bold text-primary"
            >
              Try again
            </button>
          </div>
        ) : (
          <TutorConversation
            key={thread.data.threadId}
            threadId={thread.data.threadId}
            context={entry.context}
            initialMessages={thread.data.messages}
            status={status.data}
          />
        )}
      </aside>
    </>
  );
}
