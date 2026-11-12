"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuBuilding2, LuCheck, LuX } from "react-icons/lu";
import { StatusBanner } from "@/components/admin/status-banner";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useAcceptFacilitatorInvite,
  useFacilitatorInvitePreview,
  useTutorSessionUser,
} from "@/hooks/api/use-center-facilitators";
import { getAccessToken } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";

export function FacilitatorAcceptPanel({ code }: { code: string }) {
  const router = useRouter();
  const preview = useFacilitatorInvitePreview(code);
  const accept = useAcceptFacilitatorInvite();
  const session = useTutorSessionUser(Boolean(getAccessToken("/", "tutor")));

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = preview.data;
  const ownerName = data
    ? [data.owner.firstName, data.owner.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || "the center owner"
    : "";

  async function onAccept() {
    setError(null);
    try {
      await accept.mutateAsync(code);
      setDone(true);
      router.push("/center/roster");
      router.refresh();
    } catch (err) {
      if (isApiError(err)) {
        if (err.code === "CENTER_TEAM_REQUIRED") {
          setError(
            "This center is no longer on Pro or Team. Ask the owner to upgrade again.",
          );
          return;
        }
        if (err.code === "INVITE_EMAIL_MISMATCH") {
          setError(
            "This invite is bound to a different email. Sign in with that tutor account.",
          );
          return;
        }
        if (err.code === "CENTER_FACILITATOR_CAP") {
          setError("This center already has the maximum number of facilitators.");
          return;
        }
        if (err.isAuthFailure) {
          setError("Sign in with your tutor account to accept.");
          return;
        }
        setError(err.message || "Could not accept this invite.");
        return;
      }
      setError("Could not accept this invite. Try again.");
    }
  }

  if (preview.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading invite…" />
      </div>
    );
  }

  if (preview.isError || !data) {
    const status = isApiError(preview.error) ? preview.error.status : 0;
    const codeName = isApiError(preview.error) ? preview.error.code : "";
    const expired =
      status === 410 ||
      codeName === "INVITE_EXPIRED" ||
      codeName === "INVITE_REVOKED" ||
      codeName === "INVITE_EXHAUSTED";

    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <LuBuilding2 className="mx-auto h-10 w-10 text-muted" />
        <h1 className="text-xl font-bold text-foreground">
          {expired ? "This invite no longer works" : "Invite not available"}
        </h1>
        <p className="text-sm text-muted">
          {expired
            ? "Ask the center owner for a new facilitator link."
            : "This link may be wrong or the center was archived."}
        </p>
        <Link href="/center" className={buttonClass("secondary", "md")}>
          Go to Centers
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <LuCheck className="mx-auto h-10 w-10 text-success" />
        <h1 className="text-xl font-bold text-foreground">You joined the team</h1>
        <p className="text-sm text-muted">
          Opening {data.center.name}…
        </p>
      </div>
    );
  }

  const signedIn = Boolean(session.data?.id);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {error && <StatusBanner tone="error" title={error} />}

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Facilitator invite
        </p>
        <h1 className="mt-1 text-xl font-bold text-foreground">
          Join {data.center.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {ownerName} invited you to help run this center as a facilitator.
        </p>
        {data.invite.boundEmail && (
          <p className="mt-2 text-sm text-muted">
            This invite is bound to <strong>{data.invite.boundEmail}</strong>.
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <LuCheck className="h-4 w-4 text-success" />
            You can
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {(data.permissions?.can ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <LuX className="h-4 w-4 text-muted" />
            You cannot
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {(data.permissions?.cannot ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {!signedIn ? (
        <div className="space-y-3">
          <StatusBanner
            tone="info"
            title="Sign in with a tutor account to accept."
          />
          <Link
            href={`/center/login?callbackUrl=${encodeURIComponent(`/center/join-team/${code}`)}`}
            className={buttonClass("primary", "md", "w-full")}
          >
            Sign in to accept
          </Link>
        </div>
      ) : (
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={onAccept}
          disabled={accept.isPending}
        >
          {accept.isPending ? "Joining…" : "Accept and join team"}
        </Button>
      )}
    </div>
  );
}
