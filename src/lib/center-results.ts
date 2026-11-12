import type {
  AssignmentOverviewOut,
  AssignmentResultStudentStatus,
} from "@/lib/api/types";

export function formatSeconds(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins < 60) return secs ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

export function formatScore(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "—";
  return `${Math.round(score * 10) / 10}%`;
}

export function resultStudentStatusLabel(
  status: AssignmentResultStudentStatus | string | null | undefined,
): string {
  switch ((status ?? "not_started").toLowerCase()) {
    case "in_progress":
      return "In progress";
    case "submitted":
      return "Submitted";
    case "late":
      return "Late";
    case "overdue":
      return "Overdue";
    default:
      return "Not started";
  }
}

export function resultStudentStatusTone(
  status: AssignmentResultStudentStatus | string | null | undefined,
): "neutral" | "amber" | "green" | "blue" | "red" {
  switch ((status ?? "not_started").toLowerCase()) {
    case "submitted":
      return "green";
    case "in_progress":
      return "amber";
    case "late":
    case "overdue":
      return "red";
    default:
      return "neutral";
  }
}

/** P-10 verdict sentence above the fold. */
export function assignmentVerdict(overview: AssignmentOverviewOut): string {
  const { counts, scores, targetedStudents } = overview;
  const done = counts.submitted + counts.late;
  const avg = scores.average;

  if (targetedStudents === 0) {
    return "No students are targeted on this assignment yet.";
  }
  if (done === 0 && counts.inProgress === 0) {
    return `None of ${targetedStudents} students have started yet${
      counts.overdue ? ` — ${counts.overdue} overdue` : ""
    }.`;
  }
  if (avg == null) {
    return `${done} of ${targetedStudents} submitted; ${counts.inProgress} still in progress.`;
  }
  const parts = [
    `${done} of ${targetedStudents} submitted`,
    `class average ${formatScore(avg)}`,
  ];
  if (counts.overdue > 0) parts.push(`${counts.overdue} overdue`);
  if (counts.late > 0) parts.push(`${counts.late} late`);
  return `${parts.join(" · ")}.`;
}

export function recommendationStatusLabel(status: string | null | undefined) {
  switch ((status ?? "delivered").toLowerCase()) {
    case "seen":
      return "Seen";
    case "acted":
      return "Acted on";
    default:
      return "Delivered";
  }
}
