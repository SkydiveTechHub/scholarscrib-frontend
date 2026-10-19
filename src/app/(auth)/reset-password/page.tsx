"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LuLock, LuEye, LuEyeOff, LuArrowRight } from "react-icons/lu";
import { Logo } from "@/components/ui/logo";
import { useResetPassword } from "@/hooks/api/use-auth";
import { isApiError } from "@/lib/api/errors";

const MIN_LENGTH = 6;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const linkValid = token !== "" && email !== "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const reset = useResetPassword();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await reset.mutateAsync({ email, token, newPassword: password });
      router.replace("/login?reset=true");
    } catch (err) {
      if (isApiError(err) && err.isRateLimited) {
        setError("Too many attempts. Please wait a while before trying again.");
      } else if (isApiError(err) && err.status === 400 && err.message) {
        // "Invalid or expired reset token", "New password cannot be the same…"
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div>
      <Logo className="mb-8 lg:hidden" />

      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Set a new password
      </h2>
      <p className="mt-1 text-muted">
        {linkValid ? (
          <>
            Choose a new password for <strong>{email}</strong>.
          </>
        ) : (
          "This reset link is incomplete."
        )}
      </p>

      {!linkValid ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger"
        >
          Open the link from your email again, or{" "}
          <Link href="/forgot-password" className="underline">
            request a new one
          </Link>
          .
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger animate-fade-in"
            >
              {error}{" "}
              {error.includes("expired") && (
                <Link href="/forgot-password" className="underline">
                  Request a new link
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-foreground"
              >
                New password
              </label>
              <div className="relative">
                <LuLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                  minLength={MIN_LENGTH}
                  placeholder="At least 6 characters"
                  className="input pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {showPassword ? (
                    <LuEyeOff className="h-4 w-4" />
                  ) : (
                    <LuEye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="mb-1.5 block text-sm font-semibold text-foreground"
              >
                Confirm new password
              </label>
              <div className="relative">
                <LuLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError("");
                  }}
                  required
                  placeholder="Re-enter your password"
                  className="input pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={reset.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50"
            >
              {reset.isPending ? "Resetting…" : "Reset password"}
              {!reset.isPending && <LuArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
