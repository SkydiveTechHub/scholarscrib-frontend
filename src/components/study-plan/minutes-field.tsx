"use client";

import { useState } from "react";

/**
 * A number box that only commits on blur or Enter. Typing "45" passes through
 * "4", which would otherwise be saved (and flagged) as a 4-minute day.
 *
 * Remount it with a `key` that includes `value` so an outside change, such as a
 * reset, replaces what is typed.
 */
export function MinutesField({
  value,
  onCommit,
  label,
  min = 0,
  max = 600,
  step = 15,
  describedBy,
  invalid,
}: {
  value: number;
  onCommit: (minutes: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  describedBy?: string;
  invalid?: boolean;
}) {
  const [text, setText] = useState(String(value));

  function commit() {
    const parsed = Number(text);
    if (text.trim() === "" || !Number.isFinite(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, Math.round(parsed)));
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  }

  return (
    <input
      className="input w-24"
      type="number"
      inputMode="numeric"
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}
