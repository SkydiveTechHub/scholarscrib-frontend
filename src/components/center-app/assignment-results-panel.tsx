"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LuClock, LuTriangleAlert } from "react-icons/lu";
import { ComposeRecommendationButton } from "@/components/center-app/compose-recommendation";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  useAssignmentItemAnalysis,
  useAssignmentOverview,
  useAssignmentStudentRows,
} from "@/hooks/api/use-center-results";
import { isApiError } from "@/lib/api/errors";
import type { AssignmentStudentRowOut } from "@/lib/api/types";
import {
  assignmentVerdict,
  formatScore,
  formatSeconds,
  resultStudentStatusLabel,
  resultStudentStatusTone,
} from "@/lib/center-results";
import { cn } from "@/lib/utils";

type SortKey = "name" | "score" | "status" | "time";
type ListFilter = "all" | "not_started" | "overdue";

function sortRows(rows: AssignmentStudentRowOut[], key: SortKey) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (key === "name") return a.name.localeCompare(b.name);
    if (key === "status") return a.status.localeCompare(b.status);
    if (key === "time") {
      return (b.timeSpentSeconds ?? -1) - (a.timeSpentSeconds ?? -1);
    }
    return (b.score ?? -1) - (a.score ?? -1);
  });
  return copy;
}

export function AssignmentResultsPanel({
  centerId,
  assignmentId,
}: {
  centerId: string;
  assignmentId: string;
}) {
  const overview = useAssignmentOverview(centerId, assignmentId);
  const students = useAssignmentStudentRows(centerId, assignmentId);
  const items = useAssignmentItemAnalysis(centerId, assignmentId);

  const [sort, setSort] = useState<SortKey>("score");
  const [filter, setFilter] = useState<ListFilter>("all");

  const rows = useMemo(() => {
    if (!students.data) return [];
    const base =
      filter === "not_started"
        ? students.data.notStarted
        : filter === "overdue"
          ? students.data.overdue
          : students.data.students;
    return sortRows(base, sort);
  }, [students.data, filter, sort]);

  if (overview.isLoading || students.isLoading) {
    return <Spinner label="Loading results…" />;
  }

  if (overview.isError || !overview.data) {
    return (
      <div className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
        {isApiError(overview.error)
          ? overview.error.message
          : "Could not load assignment results."}
      </div>
    );
  }

  const data = overview.data;
  const counts = data.counts;

  return (
    <div className="space-y-5">
      {/* P-10: verdict + headlines above the fold */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <p className="text-sm font-semibold leading-relaxed text-foreground">
          {assignmentVerdict(data)}
        </p>
        {data.framing?.label && (
          <p className="mt-1 text-xs text-muted">{data.framing.label}</p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Average", value: formatScore(data.scores.average) },
            { label: "Median", value: formatScore(data.scores.median) },
            {
              label: "Submitted",
              value: String(counts.submitted + counts.late),
            },
            {
              label: "Avg time",
              value: formatSeconds(data.averageTimeSpentSeconds),
            },
          ].map((figure) => (
            <div
              key={figure.label}
              className="rounded-xl bg-secondary/50 p-3"
            >
              <dt className="text-xs font-semibold text-muted">{figure.label}</dt>
              <dd className="mt-0.5 text-lg font-bold tracking-tight">
                {figure.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <Badge variant="neutral">Not started {counts.notStarted}</Badge>
          <Badge variant="amber">In progress {counts.inProgress}</Badge>
          <Badge variant="green">Submitted {counts.submitted}</Badge>
          <Badge variant="red">Late {counts.late}</Badge>
          <Badge variant="red">Overdue {counts.overdue}</Badge>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground">Students</h2>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["not_started", "Not started"],
                ["overdue", "Overdue"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold",
                  filter === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["score", "Score"],
              ["name", "Name"],
              ["status", "Status"],
              ["time", "Time"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSort(id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold",
                sort === id
                  ? "bg-secondary text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              Sort: {label}
            </button>
          ))}
        </div>

        {students.isError && (
          <p className="text-sm text-danger">
            {isApiError(students.error)
              ? students.error.message
              : "Could not load student rows."}
          </p>
        )}

        {rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted">
            No students in this filter.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {rows.map((row) => (
              <li
                key={row.studentId}
                className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/center/students/${encodeURIComponent(row.studentId)}`}
                    className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {row.name}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <span>{formatScore(row.score)}</span>
                    {row.grade ? <span>Grade {row.grade}</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <LuClock className="h-3 w-3" />
                      {formatSeconds(row.timeSpentSeconds)}
                    </span>
                    {row.focusLoss?.flagged ? (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <LuTriangleAlert className="h-3 w-3" />
                        Focus loss
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={resultStudentStatusTone(row.status)}>
                    {resultStudentStatusLabel(row.status)}
                  </Badge>
                  <ComposeRecommendationButton
                    centerId={centerId}
                    studentId={row.studentId}
                    studentName={row.name}
                    assignmentId={assignmentId}
                    label="Recommend"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">Item analysis</h2>
        {items.isLoading ? (
          <Spinner label="Loading questions…" />
        ) : items.isError ? (
          <p className="text-sm text-danger">
            {isApiError(items.error)
              ? items.error.message
              : "Could not load item analysis."}
          </p>
        ) : (items.data?.items.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted">
            No graded responses yet for item analysis.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.data!.items.map((item, index) => (
              <li key={item.questionId} className="space-y-1.5 px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                    <span className="text-muted">Q{index + 1}. </span>
                    {(item.questionText || "Question").slice(0, 140)}
                    {(item.questionText?.length ?? 0) > 140 ? "…" : ""}
                  </p>
                  <Badge
                    variant={
                      (item.percentCorrect ?? 100) < 50 ? "red" : "green"
                    }
                  >
                    {item.percentCorrect == null
                      ? "—"
                      : `${Math.round(item.percentCorrect)}% correct`}
                  </Badge>
                </div>
                <p className="text-xs text-muted">
                  {item.answered} answers · avg{" "}
                  {formatSeconds(item.averageTimeSeconds)}
                  {item.mostCommonWrongOption
                    ? ` · most wrong: ${item.mostCommonWrongOption}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex justify-end">
        <ComposeRecommendationButton
          centerId={centerId}
          toCenter
          assignmentId={assignmentId}
          label="Recommend to whole center"
        />
      </div>
    </div>
  );
}
