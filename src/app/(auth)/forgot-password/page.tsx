"use client";

import Link from "next/link";
import { useState } from "react";
import { LuMail, LuArrowRight, LuArrowLeft, LuCircleCheck } from "react-icons/lu";
import { Logo } from "@/components/ui/logo";
import { useForgotPassword } from "@/hooks/api/use-auth";
import { isApiError } from "@/lib/api/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const forgot = useForgotPassword();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await forgot.mutateAsync({ email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      if (isApiError(err) && err.isRateLimited) {
        setError("Too many requests. Please wait a while before trying again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
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
        <div
          role="status"
          className="mt-6 flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm font-medium text-success animate-fade-in"
        >
          <LuCircleCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            If <strong>{sentTo}</strong> is registered, a reset link is on its
            way. It expires in 1 hour. Check your spam folder if you don&apos;t
            see it.
          </span>
        </div>
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

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  required
                  placeholder="you@example.com"
                  className="input pl-10"
                />
              </div>
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
