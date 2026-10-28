export type CategoryId =
  | "consistency"
  | "practice"
  | "improvement"
  | "revision"
  | "mastery"
  | "exam_readiness";

export const CATEGORIES: readonly { id: CategoryId; label: string }[] = [
  { id: "consistency", label: "Consistency" },
  { id: "practice", label: "Practice" },
  { id: "improvement", label: "Improvement" },
  { id: "revision", label: "Revision" },
  { id: "mastery", label: "Mastery" },
  { id: "exam_readiness", label: "Exam readiness" },
];

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

export type CardInput = {
  id: string;
  title: string;
  criteriaType: string;
  /** The backend decides the group; older responses may omit it. */
  category?: string;
  progress: number;
  target: number;
  earned: boolean;
};

export type AchievementState = "earned" | "in-progress" | "locked";

export function achievementState(a: CardInput): AchievementState {
  if (a.earned) return "earned";
  return a.progress > 0 ? "in-progress" : "locked";
}

export function categoryOf(a: CardInput): CategoryId {
  return a.category && CATEGORY_IDS.has(a.category)
    ? (a.category as CategoryId)
    : "practice";
}

export type NextStep = { text: string; href: string };

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/**
 * What to do to move a badge forward. Only criteria with a known activity get
 * a step; anything else gets none rather than an invented one.
 */
export function nextStep(a: CardInput): NextStep | null {
  if (a.earned) return null;
  const left = Math.max(a.target - a.progress, 0);
  switch (a.criteriaType) {
    case "questions_answered":
      return { text: `Answer ${plural(left, "more question", "more questions")}.`, href: "/practice" };
    case "streak_days":
      return {
        text: `Study on ${plural(left, "more day", "more days")} in a row. Finishing a practice attempt or reviewing flashcards counts.`,
        href: "/practice",
      };
    case "lessons_completed":
      return { text: `Complete ${plural(left, "more lesson", "more lessons")}.`, href: "/classroom" };
    case "cards_reviewed":
      return { text: `Review ${plural(left, "more flashcard", "more flashcards")}.`, href: "/flashcards" };
    case "subject_mastery":
      return { text: "Keep practising a subject until it reaches Strong mastery.", href: "/performance" };
    case "questions_corrected":
      return {
        text: `Answer ${plural(left, "more question", "more questions")} correctly that you missed on an earlier day.`,
        href: "/practice",
      };
    case "mock_improvement":
      return { text: "Take a few mock exams. Your badge unlocks when your score clearly improves across them.", href: "/practice/mock-exam" };
    case "perfect_score":
      return { text: "Score 100% on a practice set or exam.", href: "/practice" };
    case "mock_score_70":
      return { text: "Take a full mock exam and aim for 70% or more.", href: "/practice/mock-exam" };
    default:
      return null;
  }
}

/** Filter chips for the categories that actually have badges. */
export function availableCategories(
  items: readonly CardInput[],
): { id: CategoryId; label: string }[] {
  const present = new Set(items.map(categoryOf));
  return CATEGORIES.filter((c) => present.has(c.id)).map((c) => ({ ...c }));
}

export function filterByCategory<T extends CardInput>(
  items: readonly T[],
  category: CategoryId | "all",
): T[] {
  return category === "all" ? [...items] : items.filter((i) => categoryOf(i) === category);
}

export type StateFilter = "all" | AchievementState;

export function countByState(items: readonly CardInput[]): Record<AchievementState, number> {
  const counts: Record<AchievementState, number> = { earned: 0, "in-progress": 0, locked: 0 };
  for (const item of items) counts[achievementState(item)] += 1;
  return counts;
}

export function filterByState<T extends CardInput>(items: readonly T[], state: StateFilter): T[] {
  return state === "all" ? [...items] : items.filter((i) => achievementState(i) === state);
}

const fraction = (a: CardInput): number => (a.target > 0 ? a.progress / a.target : 0);

/** Badges already under way, closest to done first. Ties keep catalogue order. */
export function upNext<T extends CardInput>(items: readonly T[], limit = 3): T[] {
  return items
    .filter((i) => achievementState(i) === "in-progress")
    .map((item, index) => ({ item, index }))
    .sort((a, b) => fraction(b.item) - fraction(a.item) || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item);
}
