import type { DashboardSessionItem } from "@/lib/api/types";

type SubjectMap = Record<string, { slug: string; name: string; code: string }>;

/**
 * Where a session item's button goes, or `null` when it cannot be resolved
 * (a topic whose subject is no longer in the payload, or a missing slug).
 */
export function sessionItemHref(
  item: DashboardSessionItem,
  subjects: SubjectMap,
): string | null {
  const subject = item.subjectId ? subjects[item.subjectId] : undefined;

  if (item.kind === "MOCK") return "/practice/mock-exam";
  if (item.kind === "PAST") {
    return subject
      ? `/practice/past-questions/${subject.slug}`
      : "/practice/past-questions";
  }

  if (!subject || !item.slug) return null;
  const topic = `/classroom/${subject.slug}/${item.slug}`;

  switch (item.kind) {
    case "RETRIEVE":
      return item.dueCards > 0 ? "/flashcards" : `${topic}/practice`;
    case "PRACTICE":
      return `${topic}/practice`;
    case "CONTINUE":
      return topic;
    case "LEARN":
      return topic;
    default:
      return null;
  }
}

export function sessionActionLabel(item: DashboardSessionItem): string {
  switch (item.kind) {
    case "RETRIEVE":
      return item.dueCards > 0 ? "Review cards" : "Refresh";
    case "PRACTICE":
      return "Practise";
    case "CONTINUE":
      return "Continue";
    case "LEARN":
      return "Start lesson";
    default:
      return "Start";
  }
}

export function sessionKindLabel(item: DashboardSessionItem): string {
  switch (item.kind) {
    case "RETRIEVE":
      return "Revise";
    case "PRACTICE":
      return "Practise";
    case "CONTINUE":
      return "Continue";
    case "LEARN":
      return "New";
    case "MOCK":
      return "Mock exam";
    case "PAST":
      return "Past questions";
  }
}
