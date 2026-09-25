"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LuShield, LuLock, LuUser, LuEye, LuEyeOff } from "react-icons/lu";
import { isAdminPath } from "@/lib/admin-route";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Relative paths under /admin only — anything else is an open redirect or a
  // way to bounce an admin into the student app.
  const requested = searchParams.get("callbackUrl");
  const callbackUrl = requested && isAdminPath(requested) ? requested : "/admin";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { fetchApi } = await import("@/lib/api/client");
      const { setAdminToken } = await import("@/lib/client-session");
      const data = await fetchApi<{ accessToken: string }>(
        "/admin/api/auth/login",
        { body: { identifier, password }, anonymous: true, realm: "admin" },
      );
      setAdminToken(data.accessToken);

      // A push + refresh follows the round trip through the proxy: the cookie
      // is set client-side, so the browser must re-request the page for the
      // server layout to see it and let the navigation through.
      router.push(callbackUrl);
      router.refresh();
    } catch {
      // One message for every failure — bad identifier, bad password, and
      // deactivated account are indistinguishable to someone guessing.
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <LuShield className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Admin console</h1>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger">
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
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
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
              // Right padding keeps the typed value clear of the toggle.
              className="w-full rounded-xl border border-border bg-card py-3 pl-4 pr-12 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              // Not a submit button: inside a form, an unqualified button
              // submits it, so revealing the password would post the form.
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              // The label is the action, and it flips with the state — a
              // screen reader announcing a static "Toggle password" cannot say
              // whether the password is currently exposed.
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              // Skipped in the tab order: tabbing from the password field
              // should reach Sign in, not a display control.
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
    </div>
  );
}

export default async function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
