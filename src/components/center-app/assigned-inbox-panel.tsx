"use client";

import Link from "next/link";
import { LuClipboardList, LuClock } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAssignedInbox } from "@/hooks/api/use-student-centers";
import { isApiError } from "@/lib/api/errors";
import {
  assignmentCenterName,
  formatDue,
  studentStatusLabel,
  taskTypeLabel,
} from "@/lib/center-assignments";

export function AssignedInboxPanel() {
  const inbox = useAssignedInbox();

  if (inbox.isLoading) return <Spinner label="Loading assigned work…" />;

  if (inbox.isError) {
    return (
      <div className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
        Could not load assignments.{" "}
        {isApiError(inbox.error) ? inbox.error.message : "Try again shortly."}
      </div>
    );
  }

  const items = inbox.data?.assignments ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
        <LuClipboardList className="mx-auto h-8 w-8 text-muted" />
        <h2 className="mt-3 text-base font-bold text-foreground">
          Nothing assigned
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
          When a tutor at a center you joined publishes work, it shows up here
          by due date.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/recommendations"
            className={buttonClass("secondary", "md")}
          >
            Recommendations
          </Link>
          <Link href="/my-centers" className={buttonClass("secondary", "md")}>
            My centers
          </Link>
        </div>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => {
    const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    return ad - bd;
  });

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {sorted.map((a) => {
        const status = (a.studentStatus ?? "not_started").toLowerCase();
        const href = `/assigned/${encodeURIComponent(a.id)}`;
        return (
          <li key={a.id}>
            <Link
              href={href}
              className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {a.title || "Assignment"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {assignmentCenterName(a)}
                  {" · "}
                  {taskTypeLabel(a.taskType)}
                  {a.settings?.timeLimitMinutes != null
                    ? ` · ~${a.settings.timeLimitMinutes} min`
                    : ""}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <LuClock className="h-3.5 w-3.5" />
                  Due {formatDue(a.dueAt)}
                </p>
              </div>
              <Badge
                variant={
                  status === "submitted"
                    ? "green"
                    : status === "late"
                      ? "red"
                      : "amber"
                }
              >
                {studentStatusLabel(a.studentStatus)}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
