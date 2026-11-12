"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuBuilding2, LuCheck, LuEye, LuEyeOff, LuLogOut } from "react-icons/lu";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useInvitePreview,
  useJoinCenter,
} from "@/hooks/api/use-student-centers";
import { getAccessToken } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { CENTER_FREE_ACTIVE_STUDENT_LIMIT } from "@/lib/center-subjects";
import { cn } from "@/lib/utils";

/**
 * PRD §7.2 consent moment — plain language for a ~14-year-old reader.
 *
 * Signed-in state is cookie presence only: calling `/api/auth/session` here
 * would 401 anonymous visitors and the HTTP client would bounce them to
 * `/login` before they could read the consent copy.
 */
export function JoinConsentScreen({ code }: { code: string }) {
  const router = useRouter();
  const preview = useInvitePreview(code);
  const join = useJoinCenter();

  const [ackVisibility, setAckVisibility] = useState(false);
  const [ackLeave, setAckLeave] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getAccessToken("/", "student")));
  }, []);

  const invite = preview.data;

  async function accept() {
    setError("");
    if (!ackVisibility || !ackLeave) {
      setError("Tick both boxes so we know you understand.");
      return;
    }
    try {
      await join.mutateAsync({
        code,
        body: {
          accepted: true,
          version: invite?.consentVersion || "v1",
          acknowledgedVisibility: true,
          acknowledgedLeave: true,
          guardianConsentAttested: guardian || undefined,
        },
      });
      setDone(true);
      router.push("/my-centers");
      router.refresh();
    } catch (err) {
      if (isApiError(err)) {
        if (
          err.code === "INVITE_EMAIL_MISMATCH" ||
          /different email/i.test(err.message)
        ) {
          setError(
            "This invite was sent to a different email. Sign in with that account, or ask your tutor for a new invite.",
          );
          return;
        }
        if (
          err.code === "CENTER_FREE_CAP" ||
          err.code === "center_roster_full" ||
          /limit|full|cap/i.test(err.message)
        ) {
          setError(
            `This center is full on the Free plan (max ${CENTER_FREE_ACTIVE_STUDENT_LIMIT} students). Ask your tutor to upgrade, or try again later.`,
          );
          return;
        }
        if (err.isAuthFailure) {
          setError("Sign in to join this center.");
          return;
        }
        setError(err.message || "Could not join this center.");
        return;
      }
      setError("Could not join this center. Try again.");
    }
  }

  if (preview.isLoading) {
    return <Spinner label="Loading invite…" />;
  }

  if (preview.isError || !invite) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <LuBuilding2 className="mx-auto h-10 w-10 text-muted" />
        <h1 className="text-xl font-bold">Invite not available</h1>
        <p className="text-sm text-muted">
          This link may be wrong, expired, or revoked. Ask your tutor for a new
          one.
        </p>
        <Link href="/dashboard" className={buttonClass("secondary", "md")}>
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (invite.revoked || invite.expired) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <h1 className="text-xl font-bold">This invite no longer works</h1>
        <p className="text-sm text-muted">
          Ask {invite.tutorName} for a new link to join {invite.centerName}.
        </p>
      </div>
    );
  }

  if (invite.full) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <h1 className="text-xl font-bold">This center is full</h1>
        <p className="text-sm text-muted">
          {invite.centerName} has reached its Free plan limit. Ask your tutor to
          upgrade before you can join.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <LuCheck className="mx-auto h-10 w-10 text-success" />
        <h1 className="text-xl font-bold">You joined {invite.centerName}</h1>
        <Link href="/my-centers" className={buttonClass("primary", "md")}>
          View my centers
        </Link>
      </div>
    );
  }

  const callback = encodeURIComponent(`/join/${code}`);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Center invite
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Join {invite.centerName}?
        </h1>
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{invite.tutorName}</span>
          {invite.state ? ` · ${invite.state}` : ""} invited you.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <LuEye className="h-4 w-4 text-primary" />
          What your tutor will see
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>Results of tasks <strong className="text-foreground">they assign</strong></li>
          <li>Whether you started and finished those tasks</li>
          <li>Your answers on those tasks (including per-question)</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <LuEyeOff className="h-4 w-4 text-muted" />
          What they will not see
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>Practice you start yourself</li>
          <li>Your mastery, study plan, flashcards, or streaks</li>
          <li>Astra chats</li>
          <li>Work from any other tutor</li>
          <li>Your email, phone, or address</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">What they can do</h2>
        <p className="text-sm text-muted">
          Assign tasks and send short recommendations about those tasks.
        </p>
        <h2 className="flex items-center gap-2 pt-2 text-sm font-bold">
          <LuLogOut className="h-4 w-4" />
          You stay in control
        </h2>
        <p className="text-sm text-muted">
          You can leave this center anytime from My centers. Leaving is
          immediate and your tutor cannot block it.
        </p>
      </section>

      {!signedIn ? (
        <div className="space-y-3 rounded-xl border border-border bg-secondary p-4">
          <p className="text-sm text-foreground">
            Sign in (or create a free account) to accept. Your account stays
            yours — the center does not own it.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/login?callbackUrl=${callback}`}
              className={buttonClass("primary", "md", "w-full sm:w-auto")}
            >
              Sign in to join
            </Link>
            <Link
              href={`/register?callbackUrl=${callback}`}
              className={buttonClass("secondary", "md", "w-full sm:w-auto")}
            >
              Create account
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={ackVisibility}
              onChange={(e) => setAckVisibility(e.target.checked)}
              className="mt-1"
            />
            <span>
              I understand what {invite.tutorName} can and cannot see.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={ackLeave}
              onChange={(e) => setAckLeave(e.target.checked)}
              className="mt-1"
            />
            <span>I know I can leave this center anytime.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={guardian}
              onChange={(e) => setGuardian(e.target.checked)}
              className="mt-1"
            />
            <span>
              If I am under 18, my parent or guardian knows I am joining this
              center.
            </span>
          </label>

          {error && (
            <div
              className={cn(
                "rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger",
              )}
            >
              {error}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={join.isPending || !ackVisibility || !ackLeave}
            onClick={() => void accept()}
          >
            {join.isPending ? "Joining…" : `Join ${invite.centerName}`}
          </Button>
        </div>
      )}
    </div>
  );
}
