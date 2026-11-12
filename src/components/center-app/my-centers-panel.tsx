"use client";

import { useState } from "react";
import Link from "next/link";
import { LuBuilding2, LuLogOut } from "react-icons/lu";
import { CenterEmptyState } from "@/components/center-app/center-empty-state";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useLeaveCenter, useMyCenters } from "@/hooks/api/use-student-centers";
import { isApiError } from "@/lib/api/errors";
import type { StudentCenterMembershipOut } from "@/lib/api/types";

const DEFAULT_VISIBILITY =
  "Sees results only on tasks they assign — not your private practice.";

export function MyCentersPanel() {
  const mine = useMyCenters();
  const leave = useLeaveCenter();
  const [leaving, setLeaving] = useState<StudentCenterMembershipOut | null>(
    null,
  );
  const [error, setError] = useState("");

  if (mine.isLoading) {
    return <Spinner label="Loading your centers…" />;
  }

  if (mine.isError) {
    return (
      <CenterEmptyState
        title="Could not load centers"
        message="Check your connection and try again."
      />
    );
  }

  const centers = (mine.data?.centers ?? []).filter((c) => {
    const status = (c.status || "").toUpperCase();
    return status === "ACTIVE" || status === "INVITED";
  });

  if (centers.length === 0) {
    return (
      <CenterEmptyState
        title="You are not in any center"
        message="When a tutor invites you, open their link to join. Your normal study account stays the same."
      />
    );
  }

  async function confirmLeave() {
    if (!leaving) return;
    setError("");
    try {
      await leave.mutateAsync(leaving.centerId);
      setLeaving(null);
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message || "Could not leave this center."
          : "Could not leave this center.",
      );
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {centers.map((c) => (
          <li
            key={c.centerId}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <LuBuilding2 className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="truncate">{c.centerName}</span>
                </p>
                <p className="text-sm text-muted">
                  Tutor: {c.tutorName}
                  {c.state ? ` · ${c.state}` : ""}
                </p>
                <p className="text-xs text-muted">
                  {c.visibilitySummary || DEFAULT_VISIBILITY}
                </p>
                {c.joinedAt && (
                  <p className="text-xs text-muted">
                    Joined {new Date(c.joinedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setError("");
                  setLeaving(c);
                }}
              >
                <LuLogOut className="h-3.5 w-3.5" /> Leave
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        Manage invitations from tutors here.{" "}
        <Link href="/settings" className="font-semibold text-foreground underline underline-offset-2">
          Back to settings
        </Link>
      </p>

      <Modal
        open={Boolean(leaving)}
        onClose={() => !leave.isPending && setLeaving(null)}
        busy={leave.isPending}
        title="Leave this center?"
        description={
          leaving
            ? `You will leave ${leaving.centerName} immediately. Your tutor will no longer see new results from their assignments.`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={leave.isPending}
              onClick={() => setLeaving(null)}
            >
              Stay
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={leave.isPending}
              onClick={() => void confirmLeave()}
            >
              {leave.isPending ? "Leaving…" : "Leave center"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Your ScholarsCrib account and your own practice stay. Only the link to
          this tutor ends.
        </p>
      </Modal>
    </div>
  );
}
