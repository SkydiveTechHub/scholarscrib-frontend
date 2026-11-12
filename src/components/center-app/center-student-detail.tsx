"use client";

import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import { ComposeRecommendationButton } from "@/components/center-app/compose-recommendation";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useScopedStudentDetail } from "@/hooks/api/use-center-results";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isApiError } from "@/lib/api/errors";
import { taskTypeLabel } from "@/lib/center-assignments";
import { formatScore } from "@/lib/center-results";

export function CenterStudentDetail({ studentId }: { studentId: string }) {
  const { centersQuery, centerId: activeCenterId } = useActiveCenter();
  const centerId = activeCenterId ?? "";
  const detail = useScopedStudentDetail(centerId || null, studentId);

  if (centersQuery.isLoading || (centerId && detail.isLoading)) {
    return <Spinner label="Loading student…" />;
  }

  if (!centerId) {
    return (
      <p className="text-sm text-muted">
        Create a center first to view scoped student results.
      </p>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">
          {isApiError(detail.error)
            ? detail.error.message
            : "Student not found in this center."}
        </p>
        <Link href="/center/students" className={buttonClass("secondary", "md")}>
          Back to students
        </Link>
      </div>
    );
  }

  const data = detail.data;
  const trendMessage =
    data.trend.message ||
    (data.trend.status === "insufficient"
      ? "Not enough tasks to tell"
      : data.trend.direction
        ? `Trend: ${String(data.trend.direction)}${
            data.trend.delta != null ? ` (${data.trend.delta})` : ""
          }`
        : null);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/center/students"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        <LuArrowLeft className="h-4 w-4" /> Students
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data.student.name}
          </h1>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {data.framing.label}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {[data.student.classLevel, data.student.track]
              .filter(Boolean)
              .join(" · ") || "Assignment-scoped view only"}
          </p>
        </div>
        <ComposeRecommendationButton
          centerId={centerId}
          studentId={data.student.id}
          studentName={data.student.name}
          label="Send recommendation"
        />
      </div>

      {trendMessage && (
        <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold text-foreground">{trendMessage}</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold">Assignments from you</h2>
        {data.history.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted">
            No completed tasks from this center yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.history.map((row) => (
              <li key={`${row.assignmentId}-${row.attemptId}`}>
                <Link
                  href={`/center/assignments/${encodeURIComponent(row.assignmentId)}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-secondary/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {row.title || "Assignment"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {taskTypeLabel(row.taskType || "")}
                      {row.submittedAt
                        ? ` · ${new Date(row.submittedAt).toLocaleDateString()}`
                        : ""}
                      {row.focusLoss?.flagged ? " · Focus loss" : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm font-semibold">
                    {formatScore(row.score)}
                    {row.grade ? (
                      <span className="ml-2 text-xs text-muted">
                        {row.grade}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold">Topics (from your tasks only)</h2>
        {data.topicBreakdown.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted">
            Topic patterns appear after enough graded answers on your assignments.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.topicBreakdown.map((topic) => (
              <li
                key={topic.topicId}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {topic.topicTitle || "Topic"}
                  </p>
                  {topic.evidenceLevel === "THIN" || topic.message ? (
                    <p className="mt-0.5 text-xs text-muted">
                      {topic.message ||
                        `${topic.total} question${topic.total === 1 ? "" : "s"} so far`}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted">
                      {topic.correct}/{topic.total} correct
                      {topic.status ? ` · ${topic.status}` : ""}
                    </p>
                  )}
                </div>
                {topic.evidenceLevel === "THIN" ? (
                  <Badge variant="neutral">Thin evidence</Badge>
                ) : (
                  <Badge variant="blue">
                    {topic.accuracy == null
                      ? "—"
                      : `${Math.round(topic.accuracy)}%`}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
