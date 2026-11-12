"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LuCopy, LuPlus } from "react-icons/lu";
import { CenterEmptyState } from "@/components/center-app/center-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useCenterAssignments,
  useDuplicateAssignment,
} from "@/hooks/api/use-center-assignments";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isApiError } from "@/lib/api/errors";
import type { AssignmentOut } from "@/lib/api/types";
import {
  assignmentStatus,
  formatDue,
  statusLabel,
  statusTone,
  taskTypeLabel,
} from "@/lib/center-assignments";
import { cn } from "@/lib/utils";

type Filter = "ALL" | "DRAFT" | "OPEN" | "CLOSED";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "OPEN", label: "Open" },
  { id: "CLOSED", label: "Closed" },
];

function matchesFilter(a: AssignmentOut, filter: Filter) {
  const status = assignmentStatus(a.status);
  if (filter === "ALL") return true;
  if (filter === "DRAFT") return status === "DRAFT" || status === "SCHEDULED";
  if (filter === "OPEN") return status === "OPEN";
  return status === "CLOSED";
}

export function CenterAssignmentsPanel() {
  const { centersQuery, center, centerId } = useActiveCenter();
  const listQuery = useCenterAssignments(centerId);
  const duplicate = useDuplicateAssignment(centerId ?? "");

  const [filter, setFilter] = useState<Filter>("ALL");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const assignments = useMemo(
    () => (listQuery.data?.assignments ?? []).filter((a) => matchesFilter(a, filter)),
    [listQuery.data?.assignments, filter],
  );

  async function onDuplicate(id: string) {
    if (!centerId) return;
    setError("");
    setBusyId(id);
    try {
      await duplicate.mutateAsync(id);
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message || "Could not duplicate."
          : "Could not duplicate. Try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (centersQuery.isLoading || (centerId && listQuery.isLoading)) {
    return <Spinner label="Loading assignments…" />;
  }

  if (!center) {
    return (
      <div className="space-y-4">
        <CenterEmptyState
          title="Create a center first"
          message="You need a center before you can assign work."
        />
        <div className="flex justify-center">
          <Link href="/center/onboarding" className={buttonClass("primary", "md")}>
            Set up center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link
          href="/center/assignments/new"
          className={buttonClass("primary", "md")}
        >
          <LuPlus className="h-4 w-4" />
          New assignment
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-3 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      {listQuery.isError && (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-3 text-sm text-danger">
          Could not load assignments.{" "}
          {isApiError(listQuery.error)
            ? listQuery.error.message
            : "Try again shortly."}
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="space-y-4">
          <CenterEmptyState
            title={filter === "ALL" ? "No assignments yet" : "Nothing in this filter"}
            message={
              filter === "ALL"
                ? "Create a quiz, past-paper set, mock, or lesson and publish it to your students."
                : "Try another status, or create a new assignment."
            }
          />
          {filter === "ALL" && (
            <div className="flex justify-center">
              <Link
                href="/center/assignments/new"
                className={buttonClass("primary", "md")}
              >
                Create assignment
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {assignments.map((a) => {
            const status = assignmentStatus(a.status);
            const href =
              status === "DRAFT" || status === "SCHEDULED"
                ? `/center/assignments/new?draft=${encodeURIComponent(a.id)}`
                : `/center/assignments/${encodeURIComponent(a.id)}`;
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={href}
                    className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {a.title || "Untitled assignment"}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {taskTypeLabel(a.taskType)}
                    {" · "}
                    Due {formatDue(a.dueAt)}
                    {a.assessmentId ? " · Paper ready" : ""}
                  </p>
                </div>
                <Badge variant={statusTone(status)}>{statusLabel(status)}</Badge>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busyId === a.id}
                  onClick={() => onDuplicate(a.id)}
                  aria-label="Duplicate assignment"
                >
                  <LuCopy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
