import type {
  AssignmentLifecycleStatus,
  AssignmentTaskTypeCode,
} from "@/lib/api/types";

/** Normalize BE status casing (M1 often lowercases enums in JSON). */
export function assignmentStatus(
  value: string | null | undefined,
): AssignmentLifecycleStatus {
  return (value ?? "DRAFT").toUpperCase() as AssignmentLifecycleStatus;
}

export function taskTypeLabel(taskType: AssignmentTaskTypeCode | string): string {
  switch ((taskType ?? "").toUpperCase()) {
    case "TOPIC_QUIZ":
      return "Topic quiz";
    case "PAST_PAPER":
      return "Past paper";
    case "MOCK_EXAM":
      return "Mock exam";
    case "LESSON":
      return "Lesson";
    case "FLASHCARDS":
      return "Flashcards";
    default:
      return taskType;
  }
}

export function statusLabel(status: AssignmentLifecycleStatus | string): string {
  switch (assignmentStatus(status)) {
    case "DRAFT":
      return "Draft";
    case "SCHEDULED":
      return "Scheduled";
    case "OPEN":
      return "Open";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

export function statusTone(
  status: AssignmentLifecycleStatus | string,
): "neutral" | "amber" | "green" | "blue" | "red" {
  switch (assignmentStatus(status)) {
    case "DRAFT":
      return "neutral";
    case "SCHEDULED":
      return "amber";
    case "OPEN":
      return "green";
    case "CLOSED":
      return "blue";
    default:
      return "neutral";
  }
}

export function studentStatusLabel(status: string | null | undefined): string {
  switch ((status ?? "not_started").toLowerCase()) {
    case "in_progress":
      return "In progress";
    case "submitted":
      return "Submitted";
    case "late":
      return "Late";
    default:
      return "Not started";
  }
}

export function assignmentCenterName(a: {
  centerName?: string | null;
  center?: { name?: string | null } | null;
  sharedWith?: { centerName?: string | null } | null;
}): string {
  return (
    a.sharedWith?.centerName ||
    a.center?.name ||
    a.centerName ||
    "Center"
  );
}

export function assignmentTutorName(a: {
  tutorName?: string | null;
  tutor?: { name?: string | null } | null;
  sharedWith?: { tutorName?: string | null } | null;
}): string {
  return (
    a.sharedWith?.tutorName ||
    a.tutor?.name ||
    a.tutorName ||
    "Tutor"
  );
}

export function formatDue(iso: string | null | undefined): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function slugifySubject(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const ASSIGNMENT_EXAM_TYPES = ["WAEC", "JAMB", "NECO"] as const;

export const ASSIGNMENT_DIFFICULTIES = [
  { value: "", label: "Any difficulty" },
  { value: "BASIC", label: "Basic" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
] as const;

export const REVEAL_OPTIONS = [
  { value: "immediate", label: "Immediately after submit" },
  { value: "after_due", label: "After the due date" },
  { value: "never", label: "Never (tutor only)" },
] as const;

export const SCORING_OPTIONS = [
  { value: "best", label: "Best attempt counts" },
  { value: "latest", label: "Latest attempt counts" },
  { value: "first", label: "First attempt counts" },
] as const;

export const P0_TASK_TYPES = [
  {
    id: "TOPIC_QUIZ" as const,
    title: "Topic quiz",
    description: "Short set from one topic in the question bank.",
  },
  {
    id: "PAST_PAPER" as const,
    title: "Past paper set",
    description: "Questions from a subject, exam board, and year.",
  },
  {
    id: "MOCK_EXAM" as const,
    title: "Mock exam",
    description: "A longer timed sitting across a subject scope.",
  },
  {
    id: "LESSON" as const,
    title: "Lesson",
    description: "Send students to a classroom topic to study.",
  },
] as const;
