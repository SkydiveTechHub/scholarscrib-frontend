"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LuShield, LuLock, LuEye, LuEyeOff } from "react-icons/lu";
import { useAdminResetPassword } from "@/hooks/api/use-auth";
import { isApiError } from "@/lib/api/errors";

const MIN_LENGTH = 6;

function AdminResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  // The emailed link carries the admin's email; the API calls it `identifier`.
  const identifier = searchParams.get("email") ?? "";
  const linkValid = token !== "" && identifier !== "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const reset = useAdminResetPassword();

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
      await reset.mutateAsync({ identifier, token, newPassword: password });
      router.replace("/admin/login?reset=true");
    } catch (err) {
      if (isApiError(err) && err.isRateLimited) {
        setError("Too many attempts. Please wait a while before trying again.");
      } else if (isApiError(err) && err.status === 400 && err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <LuShield className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Set a new password</h1>
      </div>

      {!linkValid ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger"
        >
          This reset link is incomplete.{" "}
          <Link href="/admin/forgot-password" className="underline">
            Request a new one
          </Link>
          .
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger"
            >
              {error}{" "}
              {error.includes("expired") && (
                <Link href="/admin/forgot-password" className="underline">
                  Request a new link
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <LuLock className="h-4 w-4" /> New password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={MIN_LENGTH}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="w-full rounded-xl border border-border bg-card py-3 pl-4 pr-12 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-muted transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                >
                  {showPassword ? (
                    <LuEyeOff className="h-4 w-4" />
                  ) : (
                    <LuEye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <LuLock className="h-4 w-4" /> Confirm new password
              </span>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError("");
                }}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>

            <button
              type="submit"
              disabled={reset.isPending}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-60"
            >
              {reset.isPending ? "Resetting…" : "Reset password"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense>
      <AdminResetPasswordForm />
    </Suspense>
  );
}
