"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LuMaximize2, LuMinimize2 } from "react-icons/lu";
import { AdminAstraApp } from "@/components/admin/astra/admin-astra-app";
import { trapTarget } from "@/lib/tutor/focus-trap";
import { cn } from "@/lib/utils";

const FOCUSABLE = 'button, [href], textarea, input, [tabindex]:not([tabindex="-1"])';
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

/** Default export so the console shell can load it on first open. */
export default function AdminAstraPanel({
  isOwner,
  onClose,
}: {
  isOwner: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const docked = useIsDocked();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const nested = Array.from(
        document.querySelectorAll("[role=dialog][aria-modal=true]"),
      ).some((el) => el !== ref.current);
      if (nested) return;
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || docked || !ref.current) return;
      const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => !node.hasAttribute("disabled"),
      );
      const target = trapTarget(nodes, document.activeElement, ref.current, event.shiftKey);
      if (target) {
        event.preventDefault();
        target.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [docked, onClose]);

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
      document.querySelector<HTMLElement>("[data-admin-astra-trigger]")?.focus();
    };
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 min-[1440px]:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside
        ref={ref}
        role="dialog"
        aria-modal={!docked}
        aria-label="Astra"
        tabIndex={-1}
        className={cn(
          "fixed z-50 flex flex-col bg-card shadow-xl outline-none",
          "inset-x-0 bottom-0 rounded-t-2xl border-t border-border",
          expanded ? "h-[100dvh] rounded-none" : "h-[75dvh]",
          "lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[400px] lg:rounded-none lg:border-l lg:border-t-0",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border lg:hidden" aria-hidden />
        <div className="flex justify-end px-2 lg:hidden">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Shrink" : "Expand"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-secondary"
          >
            {expanded ? <LuMinimize2 className="h-4 w-4" /> : <LuMaximize2 className="h-4 w-4" />}
          </button>
        </div>
        <AdminAstraApp isOwner={isOwner} fill onClose={onClose} />
      </aside>
    </>
  );
}
