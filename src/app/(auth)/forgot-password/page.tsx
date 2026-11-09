"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuMail, LuArrowRight, LuArrowLeft, LuCircleCheck } from "react-icons/lu";
import { Logo } from "@/components/ui/logo";
import { FieldError, INVALID_INPUT } from "@/components/ui/field-error";
import { useForgotPassword } from "@/hooks/api/use-auth";
import { isApiError } from "@/lib/api/errors";
import { validateForgotPassword } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

// Each request emails a fresh link, so resending is throttled client-side too;
// the API's own rate limit remains the real guard.
const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const forgot = useForgotPassword();
  const inFlight = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send(target: string) {
    // The ref closes the gap before isPending re-renders the button disabled.
    if (inFlight.current) return;
    inFlight.current = true;
    setError("");
    try {
      await forgot.mutateAsync({ email: target });
      setSentTo(target);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (isApiError(err) && err.isRateLimited) {
        setError("Too many requests. Please wait a while before trying again.");
      } else if (isApiError(err)) {
        setError("Something went wrong on our end. Please try again in a moment.");
      } else {
        setError(
          "We couldn't reach the server. Check your internet connection and try again.",
        );
      }
    } finally {
      inFlight.current = false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { email: message } = validateForgotPassword({ email });
    setFieldError(message);
    if (message) {
      setError("");
      emailRef.current?.focus();
      return;
    }
    await send(email.trim());
  }

  function useDifferentEmail() {
    setSentTo("");
    setError("");
    setCooldown(0);
  }

  return (
    <div>
      <Logo className="mb-8 lg:hidden" />

      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Forgot your password?
      </h2>
      <p className="mt-1 text-muted">
        Enter your email and we&apos;ll send you a link to reset it.
      </p>

      {sentTo ? (
        <>
          <div
            role="status"
            className="mt-6 flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm font-medium text-success animate-fade-in"
          >
            <LuCircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              If <strong>{sentTo}</strong> is registered, a reset link is on its
              way. It expires in 1 hour. Check your spam folder if you
              don&apos;t see it.
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger animate-fade-in"
            >
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 text-sm">
            <button
              type="button"
              onClick={() => send(sentTo)}
              disabled={cooldown > 0 || forgot.isPending}
              className="font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            >
              {forgot.isPending
                ? "Sending…"
                : cooldown > 0
                  ? `Resend email in ${cooldown}s`
                  : "Resend email"}
            </button>
            <button
              type="button"
              onClick={useDifferentEmail}
              className="text-left font-semibold text-muted hover:text-foreground hover:underline"
            >
              Use a different email
            </button>
          </div>
        </>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger animate-fade-in"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold text-foreground"
              >
                Email address
              </label>
              <div className="relative">
                <LuMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError(undefined);
                    setError("");
                  }}
                  onBlur={() =>
                    email && setFieldError(validateForgotPassword({ email }).email)
                  }
                  required
                  aria-required="true"
                  aria-invalid={fieldError ? true : undefined}
                  aria-describedby={fieldError ? "email-error" : undefined}
                  placeholder="you@example.com"
                  className={cn("input pl-10", fieldError && INVALID_INPUT)}
                />
              </div>
              <FieldError id="email" message={fieldError} />
            </div>

            <button
              type="submit"
              disabled={forgot.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50"
            >
              {forgot.isPending ? "Sending…" : "Send reset link"}
              {!forgot.isPending && <LuArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
        >
          <LuArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
