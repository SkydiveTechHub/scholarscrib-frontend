/** How long without any input before the next interaction counts as a return. */
export const IDLE_LIMIT_MS = 30 * 60 * 1000;

/** sessionStorage: set once the sign-in greeting has been handled in this tab. */
export const GREETED_KEY = "scholarscrib:greeted";
/** localStorage: last input time, shared so any tab's activity counts. */
export const LAST_ACTIVE_KEY = "scholarscrib:last-active";

export type Encouragement = { title: string; body: string };

export const ENCOURAGEMENTS: readonly Encouragement[] = [
  {
    title: "You've got this",
    body: "Every question you practise today makes the exam hall a little less scary.",
  },
  {
    title: "Small steps add up",
    body: "Even twenty focused minutes move you closer to the score you want.",
  },
  {
    title: "Mistakes mean you're learning",
    body: "A wrong answer here is a right answer you won't miss on exam day.",
  },
  {
    title: "Consistency beats cramming",
    body: "Showing up is the hardest part, and you just did it. Be proud of that.",
  },
  {
    title: "Believe in your preparation",
    body: "You are further along than you were yesterday. Keep that momentum going.",
  },
  {
    title: "One topic at a time",
    body: "You don't have to master everything today. Just pick one topic and begin.",
  },
];

/** True once the gap since the last input is long enough to count as being away. */
export function isIdleGap(
  lastActive: number | null,
  now: number,
  limit: number = IDLE_LIMIT_MS,
): boolean {
  if (lastActive === null || !Number.isFinite(lastActive)) return false;
  return now - lastActive >= limit;
}

/**
 * Exam and quiz surfaces, where a popup would interrupt a timed or graded
 * attempt. The greeting waits and shows once the student leaves them.
 */
export function isAssessmentPath(pathname: string): boolean {
  return (
    /\/session\/?$/.test(pathname) ||
    /^\/classroom\/[^/]+\/[^/]+\/(quiz|practice)\/?$/.test(pathname)
  );
}

/** A random message, never the one shown last when there is a choice. */
export function pickEncouragement(
  previousIndex: number | null,
  random: () => number = Math.random,
): { index: number; message: Encouragement } {
  const count = ENCOURAGEMENTS.length;
  let index = Math.min(count - 1, Math.floor(random() * count));
  if (count > 1 && index === previousIndex) index = (index + 1) % count;
  return { index, message: ENCOURAGEMENTS[index] };
}

/** For the sign-in paths: forget that this tab was greeted so the next dashboard load greets again. */
export function markFreshSignIn(): void {
  try {
    window.sessionStorage.removeItem(GREETED_KEY);
  } catch {
    // Storage blocked: the greeting falls back to once per page load.
  }
}
