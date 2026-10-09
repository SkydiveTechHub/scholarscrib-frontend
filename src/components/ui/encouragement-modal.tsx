"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LuSparkles } from "react-icons/lu";
import { Modal } from "@/components/ui/modal";
import { buttonClass } from "@/components/ui/button";
import {
  GREETED_KEY,
  LAST_ACTIVE_KEY,
  isAssessmentPath,
  isIdleGap,
  pickEncouragement,
  type Encouragement,
} from "@/lib/encouragement";

/** Input events arrive in bursts; the stored timestamp only needs second-level accuracy. */
const WRITE_EVERY_MS = 5000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

function readLastActive(): number | null {
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVE_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function writeLastActive(now: number) {
  try {
    window.localStorage.setItem(LAST_ACTIVE_KEY, String(now));
  } catch {
    // Storage blocked: idle detection degrades to the sign-in greeting only.
  }
}

/**
 * Greets the student with an encouraging message on sign-in and when they come
 * back after a long idle spell. Idle is judged by comparing timestamps on the
 * next interaction, not by a timer: browsers throttle timers in background
 * tabs, so a timer would fire late or not at all.
 */
export function EncouragementModal({ firstName }: { firstName?: string | null }) {
  const pathname = usePathname();
  // Set the moment a greeting is due; held (not shown) while on an exam surface.
  const [message, setMessage] = useState<Encouragement | null>(null);
  const lastIndexRef = useRef<number | null>(null);

  useEffect(() => {
    function trigger() {
      setMessage((current) => {
        if (current) return current;
        const { index, message: next } = pickEncouragement(lastIndexRef.current);
        lastIndexRef.current = index;
        return next;
      });
    }

    let lastWrite = 0;
    function onActivity() {
      const at = Date.now();
      const idle = isIdleGap(readLastActive(), at);
      if (idle) trigger();
      if (idle || at - lastWrite >= WRITE_EVERY_MS) {
        writeLastActive(at);
        lastWrite = at;
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") onActivity();
    }

    // Deferred a tick so the first check runs after hydration, not inside the effect body.
    const initial = window.setTimeout(() => {
      let greeted = true;
      try {
        greeted = window.sessionStorage.getItem(GREETED_KEY) === "1";
        if (!greeted) window.sessionStorage.setItem(GREETED_KEY, "1");
      } catch {
        // Blocked: greet once per page load rather than never.
        greeted = false;
      }
      const now = Date.now();
      if (!greeted || isIdleGap(readLastActive(), now)) trigger();
      writeLastActive(now);
      lastWrite = now;
    }, 0);

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initial);
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const open = message !== null && !isAssessmentPath(pathname);

  function close() {
    setMessage(null);
  }

  if (!open || !message) return null;

  return (
    <Modal
      open
      onClose={close}
      title={firstName ? `${message.title}, ${firstName}` : message.title}
      className="max-w-md"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={close}
            className={buttonClass("primary", "md")}
          >
            Let&apos;s go
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden
        >
          <LuSparkles className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-muted">{message.body}</p>
      </div>
    </Modal>
  );
}
