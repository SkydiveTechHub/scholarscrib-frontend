"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export const OTP_LENGTH = 6;

/** Individual digit inputs that behave like one field. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Called with the full code as soon as all digits are filled. */
  onComplete: (v: string) => void;
  disabled: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function fill(next: string) {
    onChange(next);
    if (next.length === OTP_LENGTH) {
      refs.current[OTP_LENGTH - 1]?.focus();
      onComplete(next);
    } else {
      refs.current[Math.min(next.length, OTP_LENGTH - 1)]?.focus();
    }
  }

  // onPaste fires before the browser applies maxLength, so we get the full text.
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted) fill(pasted);
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1); // last char in case browser sneaks two
    const digits = value.padEnd(OTP_LENGTH, "").split("");
    digits[index] = digit;
    const next = digits.join("").trimEnd(); // drop trailing empty slots
    fill(next);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-12 w-10 rounded-xl border border-border bg-card text-center text-lg font-bold text-foreground shadow-soft outline-none transition-all",
            "focus:border-primary focus:ring-4 focus:ring-primary/15",
            "disabled:opacity-50",
          )}
        />
      ))}
    </div>
  );
}
