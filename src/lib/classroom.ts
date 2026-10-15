import type { CheckBlock, LessonBlock, ShortBlock } from "@/lib/lesson-engine";
import {
  CLASS_LEVELS,
  type ClassLevel,
} from "@/lib/curriculum-scope";

// Decision logic for the Classroom section. Pure — no database, no React — so
// the rules that decide what a student sees can be tested directly.

/**
 * Whether the graded practice test, and the untimed "more questions" set beside
 * it, are offered on the topic page. Off while the question logic behind them is
 * not ready: the lesson ends on the quick quiz instead. The backend that marks
 * the test and completes the lesson is built and unaffected; turning this on
 * puts the test back as the end-of-lesson action and moves the quick quiz into
 * the "practise this topic" row. Until then no lesson can be completed from the
 * page, because completion comes only from passing the test.
 */
export const PRACTICE_TEST_ENABLED = false;

/**
 * Everything a note renders. Questions (`check` and `short`) are not part of
 * the lesson: they are the quick quiz, so the lesson would otherwise ask the
 * same things twice.
 */
export type NotesBlock = Exclude<LessonBlock, CheckBlock | ShortBlock>;

/**
 * The lesson as a continuous note.
 *
 * Questions are dropped: a note is read, not answered, and the quick quiz
 * already asks every one of them. So is the quiz section's own heading and
 * instructions ("Quiz (8 Questions) / Choose the correct option..."), which the
 * lesson parser keeps as a card of its own and which is meaningless once the
 * questions are gone.
 */
export function toNotes(blocks: readonly LessonBlock[]): NotesBlock[] {
  return blocks.filter(
    (block): block is NotesBlock =>
      block.type !== "check" && block.type !== "short" && !isQuizRubric(block),
  );
}

/** The card a note's "## Quiz ..." section leaves behind: its heading and rubric. */
function isQuizRubric(block: LessonBlock): boolean {
  // Same test the lesson parser uses to recognise a quiz heading.
  return block.type === "concept" && /^quiz\b/i.test((block.title ?? "").trim());
}

/**
 * Which class tab to open on.
 *
 * The student's own class when it has topics — an SS2 student should reach SS2
 * Physics in zero taps. Otherwise the lowest class that has any, so the page
 * never opens on an empty tab.
 */
export function resolveClassLevel(
  preferred: string | null | undefined,
  classesWithTopics: readonly string[],
): ClassLevel {
  const available = CLASS_LEVELS.filter((level) =>
    classesWithTopics.includes(level),
  );
  if (preferred && available.includes(preferred as ClassLevel)) {
    return preferred as ClassLevel;
  }
  return available[0] ?? "SS1";
}

/**
 * Remounts the class/term browser when the subject or the student's class
 * changes, so its tab state resets to the opening class instead of carrying
 * over from the previous subject.
 */
export function browserKey(subjectId: string, initialClassLevel: string): string {
  return `${subjectId}:${initialClassLevel}`;
}

export type TopicNavItem = {
  slug: string;
  title: string;
  classLevel: string;
  term: string;
  orderIndex: number;
};

/**
 * Which resources the topic page shows.
 *
 * Topic-specific resources win. Falling back to the subject's is better than an
 * empty section, but the caller must label it honestly — the `source` field is
 * what lets it say "More Physics resources" rather than implying these belong
 * to this topic.
 */
/**
 * Deep link from a subject's Classroom page into the scoped mock exam picker,
 * covering the whole of the selected class year.
 *
 * Lives here, shared by both sides of the server/client boundary, for two
 * reasons. First, a server component cannot hand a client component a function
 * — React cannot serialise one across that boundary — so the client builds the
 * URL itself from a plain `subjectId`. Second, these parameter names are a
 * contract with the picker's deep-link parser, and keeping the builder next to
 * its tests is what stops the two drifting apart.
 */
export function mockExamHrefFor({
  subjectId,
  classLevel,
}: {
  subjectId: string;
  classLevel: ClassLevel;
}): string {
  const params = new URLSearchParams({
    subjectId,
    fromClass: classLevel,
    fromTerm: "FIRST",
    toClass: classLevel,
    toTerm: "THIRD",
  });
  return `/practice/mock-exam?${params.toString()}`;
}

export function selectResources<T>(
  lessonResources: readonly T[],
  subjectResources: readonly T[],
): { items: T[]; source: "topic" | "subject" | "none" } {
  if (lessonResources.length > 0) {
    return { items: [...lessonResources], source: "topic" };
  }
  if (subjectResources.length > 0) {
    return { items: [...subjectResources], source: "subject" };
  }
  return { items: [], source: "none" };
}
