"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  LuMail,
  LuLock,
  LuUser,
  LuArrowRight,
  LuArrowLeft,
  LuCheck,
  LuEye,
  LuEyeOff,
} from "react-icons/lu";
import { NIGERIAN_STATES } from "@/lib/constants/exam-types";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { isApiError } from "@/lib/api/errors";
import { useLogin, useRegister } from "@/hooks/api/use-auth";
import { markFreshSignIn } from "@/lib/encouragement";
import { FieldError, INVALID_INPUT } from "@/components/ui/field-error";
import {
  REGISTER_STEP_FIELDS,
  validateRegisterStep,
  type FieldErrors,
  type RegisterField,
} from "@/lib/auth-validation";

// Two steps, not three. State was a single optional dropdown on a step of its
// own, which read as a hurdle rather than a question — it now sits with the
// other academic details.
const STEPS = [{ label: "Your details" }, { label: "Class & track" }];

const LAST_STEP = STEPS.length;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const register = useRegister();
  const login = useLogin();
  // Covers register, the automatic sign-in and the navigation after them, and
  // stays true through the redirect so the button can't be pressed twice.
  const [submitting, setSubmitting] = useState(false);
  const loading = submitting;
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    role: "STUDENT" as string,
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    classLevel: "" as string,
    track: "" as string,
    state: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterField>>({});
  const inFlight = useRef(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) =>
      prev[field as RegisterField] ? { ...prev, [field]: undefined } : prev,
    );
    setError("");
  }

  // Re-check one field once the user leaves it (and only if they typed
  // something, so tabbing past an empty field isn't scolded early).
  function validateOnBlur(field: RegisterField) {
    if (!form[field]) return;
    const message = validateRegisterStep(step as 1 | 2, form)[field];
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  function focusField(field: RegisterField) {
    const el = document.getElementById(field);
    // Button groups (class, track) focus their first option.
    (el?.matches("input, select") ? el : el?.querySelector("button"))?.focus();
  }

  function goToStep(next: number) {
    setFieldErrors({});
    setError("");
    setStep(next);
  }

  function validateStep(): boolean {
    const errors = validateRegisterStep(step as 1 | 2, form);
    setFieldErrors(errors);
    const first = REGISTER_STEP_FIELDS[step as 1 | 2].find((f) => errors[f]);
    if (first) {
      setError("");
      focusField(first);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The ref closes the gap before `submitting` re-renders the button
    // disabled, so a fast double-click can't create the account twice.
    if (inFlight.current) return;

    if (!validateStep()) return;

    if (step < LAST_STEP) {
      goToStep(step + 1);
      return;
    }

    inFlight.current = true;
    setError("");
    setSubmitting(true);

    try {
      await register.mutateAsync(form);
    } catch (err) {
      // Only 4xx bodies are written for the user (e.g. "email already in
      // use"); a 5xx message is a server detail, so show a generic one.
      if (isApiError(err)) {
        setError(
          err.status < 500 && err.body?.error
            ? err.body.error
            : "Something went wrong on our end. Please try again in a moment.",
        );
      } else {
        setError(
          "We couldn't reach the server. Check your internet connection and try again.",
        );
      }
      inFlight.current = false;
      setSubmitting(false);
      return;
    }

    // The account exists and the backend has emailed the verification code.
    // Sign in on the student's behalf instead of making them retype the
    // credentials they just chose, then hand them to the verification step.
    try {
      const [{ setStudentToken }, data] = await Promise.all([
        import("@/lib/client-session"),
        login.mutateAsync({ email: form.email, password: form.password }),
      ]);
      setStudentToken(data.accessToken);
      markFreshSignIn();

      // A full navigation, as on the login page, so the proxy sees the fresh
      // cookie. `sent=1` tells the page the code is already on its way: a
      // second send would invalidate the one in the inbox. Stays in the
      // loading state, since the page is about to be replaced.
      window.location.assign("/verify-email?sent=1");
    } catch {
      // The account was created; only the automatic sign-in failed. Fall back
      // to the login page, where signing in lands on the same verification step.
      router.push("/login?registered=true");
    }
  }

  const optionClass = (selected: boolean) =>
    cn(
      "py-4 rounded-xl border text-center text-sm font-bold transition-all",
      selected
        ? "border-primary bg-primary-soft text-primary ring-4 ring-primary/15"
        : "border-border bg-card text-foreground hover:border-primary/40",
    );

  return (
    <div>
      {/* Mobile logo — the left panel that carries it on desktop is hidden. */}
      <Logo className="mb-8 lg:hidden" />

      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Create your account
      </h2>
      <p className="mt-1 text-muted">Free to start for students.</p>

      {/* Stepper */}
      <ol className="mt-8 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <li key={s.label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done
                    ? "bg-success text-white"
                    : active
                      ? "bg-primary text-white ring-4 ring-primary/15"
                      : "bg-secondary text-muted",
                )}
              >
                {done ? <LuCheck className="h-4 w-4" /> : n}
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  active ? "text-foreground" : "text-muted",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {/* Step 1: Personal info */}
        {step === 1 && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                I am signing up as
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={form.role === "STUDENT"}
                  onClick={() => update("role", "STUDENT")}
                  className={optionClass(form.role === "STUDENT")}
                >
                  Student
                </button>

                {/* Teacher capabilities are not built yet. Disabled rather than hidden so
                    the path is visibly planned — and the API rejects TEACHER regardless. */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className={`${optionClass(false)} cursor-not-allowed opacity-50`}
                >
                  Teacher
                  <span className="ml-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
                    Coming soon
                  </span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-1.5 block text-sm font-semibold text-foreground"
                >
                  First name
                </label>
                <div className="relative">
                  <LuUser className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    onBlur={() => validateOnBlur("firstName")}
                    required
                    aria-required="true"
                    aria-invalid={fieldErrors.firstName ? true : undefined}
                    aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                    className={cn("input pl-10", fieldErrors.firstName && INVALID_INPUT)}
                  />
                </div>
                <FieldError id="firstName" message={fieldErrors.firstName} />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="mb-1.5 block text-sm font-semibold text-foreground"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  onBlur={() => validateOnBlur("lastName")}
                  required
                  aria-required="true"
                  aria-invalid={fieldErrors.lastName ? true : undefined}
                  aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                  className={cn("input", fieldErrors.lastName && INVALID_INPUT)}
                />
                <FieldError id="lastName" message={fieldErrors.lastName} />
              </div>
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold text-foreground"
              >
                Email
              </label>
              <div className="relative">
                <LuMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  onBlur={() => validateOnBlur("email")}
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
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
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
          </>
        )}

        {/* Step 2: Class level & track */}
        {step === 2 && (
          <>
            <div>
              <span
                id="classLevel-label"
                className="mb-3 block text-sm font-semibold text-foreground"
              >
                What class are you in?
              </span>
              <div
                id="classLevel"
                role="group"
                aria-labelledby="classLevel-label"
                aria-describedby={fieldErrors.classLevel ? "classLevel-error" : undefined}
                className="grid grid-cols-3 gap-3"
              >
                {["SS1", "SS2", "SS3"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={form.classLevel === level}
                    onClick={() => update("classLevel", level)}
                    className={optionClass(form.classLevel === level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <FieldError id="classLevel" message={fieldErrors.classLevel} />
            </div>
            <div>
              <span
                id="track-label"
                className="mb-3 block text-sm font-semibold text-foreground"
              >
                What track are you in?
              </span>
              <div
                id="track"
                role="group"
                aria-labelledby="track-label"
                aria-describedby={fieldErrors.track ? "track-error" : undefined}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { value: "SCIENCE", label: "Science" },
                  { value: "ARTS", label: "Arts" },
                  { value: "COMMERCIAL", label: "Commercial" },
                ].map((track) => (
                  <button
                    key={track.value}
                    type="button"
                    aria-pressed={form.track === track.value}
                    onClick={() => update("track", track.value)}
                    className={optionClass(form.track === track.value)}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
              <FieldError id="track" message={fieldErrors.track} />
            </div>
            <div>
              <label
                htmlFor="state"
                className="mb-1.5 block text-sm font-semibold text-foreground"
              >
                Which state do you live in?
              </label>
              <select
                id="state"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                required
                aria-required="true"
                aria-invalid={fieldErrors.state ? true : undefined}
                aria-describedby={fieldErrors.state ? "state-error" : undefined}
                className={cn("input", fieldErrors.state && INVALID_INPUT)}
              >
                <option value="">Select your state</option>
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <FieldError id="state" message={fieldErrors.state} />
            </div>

            <p className="rounded-xl bg-secondary/60 p-3.5 text-xs leading-relaxed text-muted">
              Your track shapes which subjects and past questions are shown first.
              You can change this later in settings.
            </p>
          </>
        )}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition-all hover:bg-secondary active:scale-[0.99]"
            >
              <LuArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50"
          >
            {step < LAST_STEP
              ? "Continue"
              : loading
                ? "Creating account…"
                : "Create account"}
            {step < LAST_STEP && !loading && <LuArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-muted">
        By creating an account you agree to the{" "}
        <Link href="/terms" className="font-semibold text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        and acknowledge the{" "}
        <Link href="/privacy" className="font-semibold text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
