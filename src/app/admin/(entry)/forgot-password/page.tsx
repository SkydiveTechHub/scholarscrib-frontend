"use client";

import Link from "next/link";
import { useState } from "react";
import { LuShield, LuUser } from "react-icons/lu";
import { useAdminForgotPassword } from "@/hooks/api/use-auth";
import { isApiError } from "@/lib/api/errors";

export default function AdminForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const forgot = useAdminForgotPassword();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await forgot.mutateAsync({ identifier: identifier.trim() });
      setSent(true);
    } catch (err) {
      setError(
        isApiError(err) && err.isRateLimited
          ? "Too many requests. Please wait a while before trying again."
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <LuShield className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Reset admin password</h1>
      </div>

      {sent ? (
        <div
          role="status"
          className="rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm font-medium text-success"
        >
          If that account is registered, reset instructions have been sent to
          its email address. The link expires in 1 hour.
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger"
            >
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <LuUser className="h-4 w-4" /> Email or username
              </span>
              <input
                type="text"
                autoComplete="username"
                required
                minLength={3}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>

            <button
              type="submit"
              disabled={forgot.isPending}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-60"
            >
              {forgot.isPending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}

      <Link
        href="/admin/login"
        className="mt-6 text-center text-sm font-semibold text-primary hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
