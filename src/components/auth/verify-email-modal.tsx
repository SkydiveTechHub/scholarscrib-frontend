"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LuMailCheck } from "react-icons/lu";
import { useOtpSend, useOtpVerify } from "@/hooks/api/use-auth";
import { Modal } from "@/components/ui/modal";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;

/** Individual digit inputs that behave like one field. */
function OtpInput({
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

/**
 * Two-step modal: first sends the OTP, then lets the student enter and submit it.
 * On success the page is refreshed so server components pick up the updated session.
 */
export function VerifyEmailModal({
  open,
  email,
  onClose,
}: {
  open: boolean;
  email: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const sendOtp = useOtpSend();
  const verifyOtp = useOtpVerify();

  const [step, setStep] = useState<"sending" | "enter" | "done">("sending");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  // Fire the send request as soon as the modal opens.
  useEffect(() => {
    if (!open) return;
    setStep("sending");
    setOtp("");
    setError("");
    sendOtp.mutate(
      { email },
      {
        onSuccess: () => setStep("enter"),
        onError: (err) => {
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't send the code. Please try again.",
          );
          setStep("enter");
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function resend() {
    setOtp("");
    setError("");
    setStep("sending");
    sendOtp.mutate(
      { email },
      {
        onSuccess: () => setStep("enter"),
        onError: (err) => {
          setError(
            err instanceof Error ? err.message : "Couldn't resend the code.",
          );
          setStep("enter");
        },
      },
    );
  }

  function submitCode(code: string) {
    if (code.replace(/\D/g, "").length < OTP_LENGTH) {
      setError("Enter all 6 digits.");
      return;
    }
    setError("");
    verifyOtp.mutate(
      { email, otp: code },
      {
        onSuccess: () => {
          setStep("done");
          router.refresh();
          setTimeout(onClose, 1200);
        },
        onError: (err) => {
          setError(
            err instanceof Error
              ? err.message
              : "That code didn't match. Check it and try again.",
          );
        },
      },
    );
  }

  const busy = sendOtp.isPending || verifyOtp.isPending;

  if (step === "done") {
    return (
      <Modal
        open={open}
        title="Email verified"
        onClose={onClose}
        busy={busy}
        dismissible={false}
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
            <LuMailCheck className="h-7 w-7" />
          </span>
          <p className="text-sm text-muted">Your email is now verified.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      title="Verify your email"
      description={`We sent a 6-digit code to ${email}. Enter it below to confirm your account.`}
      onClose={onClose}
      busy={busy}
      footer={
        step === "enter" ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => submitCode(otp)}
              disabled={busy || otp.replace(/\D/g, "").length < OTP_LENGTH}
              className={buttonClass("primary", "lg", "w-full")}
            >
              {verifyOtp.isPending ? "Verifying…" : "Verify email"}
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={busy}
              className={buttonClass("ghost", "md", "w-full")}
            >
              Resend code
            </button>
          </div>
        ) : undefined
      }
    >
      {step === "sending" ? (
        <p className="py-4 text-center text-sm text-muted">
          Sending your code…
        </p>
      ) : (
        <div className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-center text-sm text-danger"
            >
              {error}
            </div>
          )}
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={submitCode}
            disabled={verifyOtp.isPending}
          />
        </div>
      )}
    </Modal>
  );
}
