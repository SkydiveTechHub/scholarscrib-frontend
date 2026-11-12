"use client";

import Link from "next/link";
import { useState } from "react";
import { LuArrowLeft, LuCopy } from "react-icons/lu";
import { AssignmentResultsPanel } from "@/components/center-app/assignment-results-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useCenterAssignment,
  useCloseAssignment,
  useDuplicateAssignment,
  useExtendAssignment,
} from "@/hooks/api/use-center-assignments";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isApiError } from "@/lib/api/errors";
import {
  assignmentStatus,
  formatDue,
  statusLabel,
  statusTone,
  taskTypeLabel,
} from "@/lib/center-assignments";

/**
 * Assignment detail: lifecycle actions + M3 results when open/closed.
 */
export function CenterAssignmentDetail({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const { centersQuery, centerId: activeCenterId } = useActiveCenter();
  const centerId = activeCenterId ?? "";
  const detail = useCenterAssignment(centerId || null, assignmentId);
  const close = useCloseAssignment(centerId, assignmentId);
  const extend = useExtendAssignment(centerId, assignmentId);
  const duplicate = useDuplicateAssignment(centerId);

  const [error, setError] = useState("");
  const [dueLocal, setDueLocal] = useState("");

  if (centersQuery.isLoading || detail.isLoading) {
    return <Spinner label="Loading assignment…" />;
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          {isApiError(detail.error)
            ? detail.error.message
            : "Assignment not found."}
        </p>
        <Link href="/center/assignments" className={buttonClass("secondary", "md")}>
          Back
        </Link>
      </div>
    );
  }

  const a = detail.data;
  const status = assignmentStatus(a.status);
  const showResults = status === "OPEN" || status === "CLOSED";

  async function onClose() {
    setError("");
    try {
      await close.mutateAsync();
    } catch (err) {
      setError(
        isApiError(err) ? err.message || "Could not close." : "Could not close.",
      );
    }
  }

  async function onExtend() {
    setError("");
    if (!dueLocal) {
      setError("Pick a new due date.");
      return;
    }
    try {
      await extend.mutateAsync({ dueAt: new Date(dueLocal).toISOString() });
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message || "Could not extend."
          : "Could not extend.",
      );
    }
  }

  async function onDuplicate() {
    setError("");
    try {
      const copy = await duplicate.mutateAsync(assignmentId);
      window.location.href = `/center/assignments/new?draft=${encodeURIComponent(copy.id)}`;
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message || "Could not duplicate."
          : "Could not duplicate.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/center/assignments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        <LuArrowLeft className="h-4 w-4" /> Assignments
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {a.title || "Untitled assignment"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {taskTypeLabel(a.taskType)}
            {a.assessmentId ? " · Paper ready" : ""}
            {" · Due "}
            {formatDue(a.dueAt)}
          </p>
        </div>
        <Badge variant={statusTone(status)}>{statusLabel(status)}</Badge>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(status === "DRAFT" || status === "SCHEDULED") && (
          <Link
            href={`/center/assignments/new?draft=${encodeURIComponent(a.id)}`}
            className={buttonClass("primary", "md")}
          >
            Continue editing
          </Link>
        )}
        {status === "OPEN" && (
          <Button type="button" variant="secondary" onClick={onClose}>
            Close early
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onDuplicate}>
          <LuCopy className="h-4 w-4" /> Duplicate
        </Button>
      </div>

      {(status === "OPEN" || status === "SCHEDULED") && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
          <label className="block min-w-[12rem] flex-1 space-y-1.5">
            <span className="text-sm font-semibold text-foreground">
              Extend due date
            </span>
            <input
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <Button type="button" onClick={onExtend}>
            Save due date
          </Button>
        </div>
      )}

      {showResults && centerId ? (
        <AssignmentResultsPanel
          centerId={centerId}
          assignmentId={assignmentId}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
          Results appear after you publish. Draft and scheduled assignments can
          still be edited.
        </div>
      )}
    </div>
  );
}
