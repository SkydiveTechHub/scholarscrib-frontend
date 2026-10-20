"use client";

import { useRef, useState } from "react";
import { LuArrowUp, LuSquare } from "react-icons/lu";
import { TUTOR_MAX_CHARS } from "@/lib/tutor/types";
import { cn } from "@/lib/utils";

export function TutorComposer({
  streaming,
  disabled,
  onSend,
  onStop,
}: {
  streaming: boolean;
  disabled?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const canSend = !disabled && !streaming && trimmed.length > 0;

  function submit() {
    if (!canSend) return;
    onSend(trimmed);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`; // ~4 lines
  }

  return (
    <div className="border-t border-border bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={text}
          rows={1}
          maxLength={TUTOR_MAX_CHARS}
          disabled={disabled}
          placeholder="Ask Astra anything…"
          aria-label="Message Astra"
          onChange={(e) => {
            setText(e.target.value);
            grow(e.target);
          }}
          onKeyDown={(e) => {
            // Phones use Enter for a new line; a hardware keyboard sends.
            const touch = window.matchMedia("(pointer: coarse)").matches;
            if (e.key === "Enter" && !e.shiftKey && !touch) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none sm:text-sm"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <LuSquare className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity",
              !canSend && "opacity-40",
            )}
          >
            <LuArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-muted">
        <span>Astra can make mistakes. Check important facts.</span>
        {text.length >= TUTOR_MAX_CHARS - 80 && (
          <span aria-live="polite">
            {text.length}/{TUTOR_MAX_CHARS}
          </span>
        )}
      </div>
    </div>
  );
}
