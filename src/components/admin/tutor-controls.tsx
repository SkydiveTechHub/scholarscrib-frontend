"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/admin/status-banner";
import { useSetTutorActive, useVerifyTutor } from "@/hooks/api/use-admin-centers";
import { isApiError } from "@/lib/api/errors";

const INPUT_CLS =
  "w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

export function TutorVerifyControl({
  tutorId,
  tutorVerifiedAt,
  canEdit,
  className,
}: {
  tutorId: string;
  tutorVerifiedAt?: string | null;
  canEdit: boolean;
  className?: string;
}) {
  const router = useRouter();
  const verify = useVerifyTutor();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verified = Boolean(tutorVerifiedAt);

  async function setVerified(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      await verify.mutateAsync({ tutorId, body: { verified: next } });
      router.refresh();
    } catch (e) {
      setError(isApiError(e) ? e.message : "Could not update verification.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("rounded-lg border border-border-strong bg-card p-4", className)}>
      {error && <StatusBanner tone="error" title={error} className="mb-3" />}
      <p className="text-sm text-muted">
        {verified
          ? `Verified${tutorVerifiedAt ? ` on ${formatStamp(tutorVerifiedAt)}` : ""}.`
          : "Not verified by ScholarsCrib yet. Email OTP is separate from admin verification."}
      </p>
      {canEdit && (
        <div className="mt-3">
          <Button
            variant={verified ? "outline" : "primary"}
            disabled={busy}
            onClick={() => setVerified(!verified)}
          >
            {busy
              ? "Saving…"
              : verified
                ? "Clear verification"
                : "Mark verified"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function TutorDangerZone({
  tutorId,
  tutorName,
  isActive,
  canSuspend,
  className,
}: {
  tutorId: string;
  tutorName: string;
  isActive: boolean;
  canSuspend: boolean;
  className?: string;
}) {
  const router = useRouter();
  const setActive = useSetTutorActive();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setActive.mutateAsync({
        tutorId,
        body: next ? { isActive: true } : { isActive: false, reason },
      });
      setReason("");
      router.refresh();
    } catch (e) {
      setError(isApiError(e) ? e.message : "Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  if (!canSuspend) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border-strong bg-card p-4",
        className,
      )}
    >
      {error && <StatusBanner tone="error" title={error} className="mb-4" />}

      {isActive ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            Suspending {tutorName} blocks center login for the owner (and any
            facilitators), and closes open assignments. It is reversible.
          </p>
          <label htmlFor="tutor-suspend-reason" className="sr-only">
            Reason for suspension
          </label>
          <input
            id="tutor-suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (recorded in the audit log)"
            className={INPUT_CLS}
          />
          <div>
            <Button
              onClick={() => run(false)}
              disabled={busy || reason.trim().length < 3}
            >
              {busy ? "Suspending…" : "Suspend tutor"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            This tutor is suspended. Reactivating restores login; closed
            assignments stay closed.
          </p>
          <div>
            <Button onClick={() => run(true)} disabled={busy}>
              {busy ? "Reactivating…" : "Reactivate tutor"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatStamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
