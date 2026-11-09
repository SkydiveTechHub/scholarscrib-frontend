"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { LuLock, LuEye, LuEyeOff, LuArrowRight } from "react-icons/lu";
import { Logo } from "@/components/ui/logo";
import { useResetPassword } from "@/hooks/api/use-auth";
import { isApiError } from "@/lib/api/errors";
import { FieldError, INVALID_INPUT } from "@/components/ui/field-error";
import {
  validateResetPassword,
  type FieldErrors,
  type ResetPasswordField,
} from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ResetPasswordField>>({});
  const reset = useResetPassword();
  const inFlight = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  function clearFieldError(field: ResetPasswordField) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    setError("");
  }

  // Check a field once the user leaves it, but only if they typed something.
  function validateOnBlur(field: ResetPasswordField) {
    const value = field === "password" ? password : confirm;
    if (!value) return;
    const message = validateResetPassword({ password, confirm })[field];
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The ref closes the gap before isPending re-renders the button disabled.
    if (inFlight.current) return;

    const errors = validateResetPassword({ password, confirm });
    setFieldErrors(errors);
    if (errors.password || errors.confirm) {
      setError("");
      (errors.password ? passwordRef : confirmRef).current?.focus();
      return;
    }

    inFlight.current = true;
    setError("");
    try {
      await reset.mutateAsync({ email, token, newPassword: password });
      router.replace("/login?reset=true");
    } catch (err) {
      if (isApiError(err) && err.isRateLimited) {
        setError("Too many attempts. Please wait a while before trying again.");
      } else if (isApiError(err) && err.status === 400 && err.message) {
        // "Invalid or expired reset token", "New password cannot be the same…"
        setError(err.message);
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

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
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
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                    // A stale mismatch message shouldn't outlive the edit.
                    clearFieldError("confirm");
                  }}
                  onBlur={() => validateOnBlur("password")}
                  required
                  aria-required="true"
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  placeholder="6 to 25 characters"
                  className={cn("input pl-10 pr-11", fieldErrors.password && INVALID_INPUT)}
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
              <FieldError id="password" message={fieldErrors.password} />
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
                  ref={confirmRef}
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    clearFieldError("confirm");
                  }}
                  onBlur={() => validateOnBlur("confirm")}
                  required
                  aria-required="true"
                  aria-invalid={fieldErrors.confirm ? true : undefined}
                  aria-describedby={fieldErrors.confirm ? "confirm-error" : undefined}
                  placeholder="Re-enter your password"
                  className={cn("input pl-10", fieldErrors.confirm && INVALID_INPUT)}
                />
              </div>
              <FieldError id="confirm" message={fieldErrors.confirm} />
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
