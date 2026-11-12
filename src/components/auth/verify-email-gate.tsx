"use client";

import { useEffect, useRef, useState } from "react";
import { LuMailCheck } from "react-icons/lu";
import { useOtpSend, useOtpVerify } from "@/hooks/api/use-auth";
import { buttonClass } from "@/components/ui/button";
import { OTP_LENGTH, OtpInput } from "./otp-input";

/** Seconds before "Resend code" unlocks again, after any send. */
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * The full-page step that stands between a signed-in, unverified account and
 * the rest of the app (student dashboard or tutor center console).
 *
 * Registration already triggers the code on the backend, so it arrives with
 * `alreadySent` and must not send a second one (that would invalidate the
 * first, which is the one in the inbox). Every other arrival — a password
 * sign-in by an existing unverified account — has had no code sent, so one
 * goes out as soon as this mounts.
 */
export function VerifyEmailGate({
  email,
  alreadySent,
  successHref = "/dashboard",
  realm = "student",
}: {
  email: string;
  alreadySent: boolean;
  /** Where to go after a successful verify (full navigation). */
  successHref?: string;
  /** Which session to clear on "Sign out". */
  realm?: "student" | "tutor";
}) {
  const sendOtp = useOtpSend();
  const verifyOtp = useOtpVerify();

  const [step, setStep] = useState<"sending" | "enter" | "done">(
    alreadySent ? "enter" : "sending",
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(
    alreadySent ? RESEND_COOLDOWN_SECONDS : 0,
  );

  // A ref, not a module-level flag: React strict mode re-runs effects on the
  // same instance in dev (a ref survives that, so one send, not two), while a
  // genuinely new visit to this page mounts a fresh instance and sends again.
  const sentOnMount = useRef(false);

  function send() {
    setOtp("");
    setError("");
    setStep("sending");
    sendOtp.mutate(
      { email },
      {
        onSuccess: () => {
          setStep("enter");
          setCooldown(RESEND_COOLDOWN_SECONDS);
        },
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
  }

  useEffect(() => {
    if (alreadySent || sentOnMount.current) return;
    sentOnMount.current = true;
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function submitCode(code: string) {
    if (verifyOtp.isPending || step === "done") return;
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
          // Prefer a stored deep link (invite join) over the default dashboard.
          void import("@/lib/post-auth-redirect").then(
            ({ consumePostAuthRedirect, peekPostAuthRedirect }) => {
              const stored = peekPostAuthRedirect();
              const next =
                successHref !== "/dashboard"
                  ? successHref
                  : (stored ?? "/dashboard");
              if (stored) consumePostAuthRedirect("/dashboard");
              // A full navigation, not router.push + refresh: the layout must
              // re-read the session from the backend to see the account as
              // verified, and a real request carries the cookie through the proxy.
              window.location.assign(next);
            },
          );
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

  async function handleSignOut() {
    // Same order as the complete-profile step: the next person on a shared
    // phone must not inherit this session's side effects.
    const [{ unsubscribeThisDevice }, session] = await Promise.all([
      import("@/lib/push-client"),
      import("@/lib/client-session"),
    ]);
    if (realm === "tutor") {
      await Promise.all([
        unsubscribeThisDevice(),
        session.tutorLogout("/center/login"),
      ]);
      return;
    }
    await Promise.all([
      unsubscribeThisDevice(),
      session.studentLogout("/login"),
    ]);
  }

  const busy = sendOtp.isPending || verifyOtp.isPending;
  const destinationLabel =
    realm === "tutor" ? "your center console…" : "your dashboard…";

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <LuMailCheck className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Email verified
        </h1>
        <p className="text-sm text-muted">Taking you to {destinationLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Verify your email
      </h1>
      <p className="mt-1 text-muted">
        {step === "sending"
          ? `Sending a 6-digit code to ${email}…`
          : `We sent a 6-digit code to ${email}. Enter it below to continue.`}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-center text-sm font-medium text-danger animate-fade-in"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitCode(otp);
        }}
        className="mt-6 space-y-5"
      >
        <OtpInput
          value={otp}
          onChange={setOtp}
          onComplete={submitCode}
          disabled={step === "sending" || verifyOtp.isPending}
        />

        <button
          type="submit"
          disabled={
            busy ||
            step !== "enter" ||
            otp.replace(/\D/g, "").length < OTP_LENGTH
          }
          className={buttonClass("primary", "lg", "w-full")}
        >
          {verifyOtp.isPending ? "Verifying…" : "Verify email"}
        </button>

        <button
          type="button"
          onClick={send}
          disabled={busy || cooldown > 0}
          className={buttonClass("ghost", "md", "w-full")}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Wrong account?{" "}
        <button
          type="button"
          onClick={handleSignOut}
          className="font-bold text-primary hover:underline"
        >
          Sign out
        </button>
      </p>
    </div>
  );
}
