"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, Suspense } from "react";
import {
  LuMail,
  LuLock,
  LuEye,
  LuEyeOff,
  LuArrowRight,
} from "react-icons/lu";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { useLogin } from "@/hooks/api/use-auth";
import { isApiError } from "@/lib/api/errors";
import { markFreshSignIn } from "@/lib/encouragement";
import { FieldError, INVALID_INPUT } from "@/components/ui/field-error";
import {
  validateLogin,
  type FieldErrors,
  type LoginField,
} from "@/lib/auth-validation";

function LoginForm() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "true";
  const signedOutElsewhere = searchParams.get("reason") === "device";
  // Relative paths only — an absolute URL here is an open redirect.
  const requested = searchParams.get("callbackUrl");
  const callbackUrl =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useLogin();
  const googleError = searchParams.get("error");
  const [error, setError] = useState(
    googleError === "google"
      ? "Google sign-in failed. Please try again."
      : googleError === "google_cancelled"
        ? "Google sign-in was cancelled. You can try again or sign in with your email."
        : "",
  );

  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginField>>({});
  const inFlight = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Re-check a single field once the user has left it, so the message
  // appears when they move on rather than while they are still typing.
  function validateField(field: LoginField) {
    const message = validateLogin({ email, password })[field];
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  function clearFieldError(field: LoginField) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The ref closes the gap before `loading` re-renders the button disabled,
    // so a fast double-click or Enter-repeat can't send two requests.
    if (inFlight.current) return;

    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("");
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    inFlight.current = true;
    setLoading(true);
    setError("");

    try {
      // Inside the try: a failed chunk load while offline must reset the
      // button too, not leave "Signing in…" spinning forever.
      const { setStudentToken } = await import("@/lib/client-session");
      const data = await login.mutateAsync({ email, password });
      setStudentToken(data.accessToken);
      markFreshSignIn();

      // A full navigation, not router.push + router.refresh. The refresh
      // re-fetched /login under the new session cookie, so the (auth)
      // layout's own redirect raced the push to a slow dashboard render;
      // when either failed mid-transition the client router unmounted the
      // tree and left a blank page. A real request also carries the fresh
      // cookie through the proxy and shows a server error as an error page.
      // Stays in the loading state: the page is about to be replaced.
      window.location.assign(callbackUrl);
    } catch (err) {
      if (isApiError(err)) {
        if (err.isRateLimited) {
          setError(
            "Too many sign-in attempts. Please wait a while before trying again.",
          );
        } else if (err.isAuthFailure) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      } else {
        setError(
          "We couldn't reach the server. Check your internet connection and try again.",
        );
      }
      inFlight.current = false;
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    const [{ API_URL }, { endpoints }, { isApiError }, { createGoogleState }] =
      await Promise.all([
        import("@/lib/api/config"),
        import("@/lib/api/endpoints"),
        import("@/lib/api/errors"),
        import("@/lib/google-oauth-state"),
      ]);
    markFreshSignIn();
    try {
      // /api/auth/google sends the browser to Google, which returns to the
      // site root with ?code=. <GoogleCallback /> on the landing page trades
      // that code for an access token via POST /api/auth/google/tokens.
      const state = createGoogleState();
      window.location.assign(
        `${API_URL}${endpoints.auth.google}?state=${encodeURIComponent(state)}`,
      );
    } catch (err) {
      if (!isApiError(err)) {
        setError("Google sign-in is not configured yet. Use email instead.");
      }
    }
  }

  return (
    <div>
      {/* Mobile logo — the left panel that carries it on desktop is hidden. */}
      <Logo className="mb-8 lg:hidden" />

      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Welcome back
      </h2>
      <p className="mt-1 text-muted">Sign in to continue your preparation.</p>

      {justRegistered && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm font-medium text-success animate-fade-in">
          <LuArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Account created! Sign in to get started.
        </div>
      )}

      {searchParams.get("reset") === "true" && (
        <div
          role="status"
          className="mt-6 flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm font-medium text-success animate-fade-in"
        >
          <LuArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Password reset. Sign in with your new password.
        </div>
      )}

      {searchParams.get("deleted") === "1" && (
        <div
          role="status"
          className="mt-6 flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm font-medium text-success animate-fade-in"
        >
          <LuArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Your account has been deleted.
        </div>
      )}

      {signedOutElsewhere && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-primary/25 bg-primary-soft p-3.5 text-sm font-medium text-foreground animate-fade-in"
        >
          You were signed out because this account was signed in on another
          device. If that wasn&apos;t you, change your password.
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger animate-fade-in">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-5">
        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground shadow-soft transition-all hover:border-primary/40 hover:bg-primary-soft active:scale-[0.99]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs font-semibold text-muted">
              or
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                  clearFieldError("email");
                }}
                onBlur={() => email && validateField("email")}
                required
                aria-required="true"
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                placeholder="you@example.com"
                className={cn("input pl-10", fieldErrors.email && INVALID_INPUT)}
              />
            </div>
            <FieldError id="email" message={fieldErrors.email} />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-semibold text-foreground"
            >
              Password
            </label>
            <div className="relative">
              <LuLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                ref={passwordRef}
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                required
                aria-required="true"
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                placeholder="Enter your password"
                className={cn("input pl-10 pr-11", fieldErrors.password && INVALID_INPUT)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={cn(
                  "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-secondary hover:text-foreground",
                )}
              >
                {showPassword ? (
                  <LuEyeOff className="h-4 w-4" />
                ) : (
                  <LuEye className="h-4 w-4" />
                )}
              </button>
            </div>
            <FieldError id="password" message={fieldErrors.password} />
            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && <LuArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-bold text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
