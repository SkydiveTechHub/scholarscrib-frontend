"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  LuBuilding2,
  LuEye,
  LuEyeOff,
  LuLock,
  LuMail,
} from "react-icons/lu";
import { isCenterPath } from "@/lib/center-route";
import { useTutorLogin } from "@/hooks/api/use-auth";
import { isApiError } from "@/lib/api/errors";

function CenterLoginForm() {
  const searchParams = useSearchParams();

  // Relative paths under /center only — anything else is an open redirect.
  const requested = searchParams.get("callbackUrl");
  const callbackUrl =
    requested && isCenterPath(requested) ? requested : "/center";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const tutorLogin = useTutorLogin();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { setTutorToken } = await import("@/lib/client-session");
      const data = await tutorLogin.mutateAsync({ email, password });
      setTutorToken(data.accessToken);

      // Always land on verify-email first (same as students). Already-verified
      // tutors are redirected to the console by that page. Preserve callback
      // only after verify by going through the gate.
      const next =
        callbackUrl !== "/center"
          ? `/center/verify-email?callbackUrl=${encodeURIComponent(callbackUrl)}`
          : "/center/verify-email";
      window.location.assign(next);
    } catch (err) {
      if (isApiError(err) && err.isRateLimited) {
        setError(
          "Too many sign-in attempts. Please wait a while before trying again.",
        );
      } else {
        setError("Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <LuBuilding2 className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Tutor Centers</h1>
      </div>

      <p className="mb-6 text-sm text-muted">
        Sign in as a center owner to manage roster, assignments, and billing.
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <LuMail className="h-4 w-4" /> Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <LuLock className="h-4 w-4" /> Password
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New center owner?{" "}
        <Link
          href="/register"
          className="font-bold text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Student?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}

export default function CenterLoginPage() {
  return (
    <Suspense>
      <CenterLoginForm />
    </Suspense>
  );
}
