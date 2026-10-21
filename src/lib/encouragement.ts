/** How long without any input before the next interaction counts as a return. */
export const IDLE_LIMIT_MS = 30 * 60 * 1000;

/** sessionStorage: set once the sign-in greeting has been handled in this tab. */
export const GREETED_KEY = "scholarscrib:greeted";
/** localStorage: last input time, shared so any tab's activity counts. */
export const LAST_ACTIVE_KEY = "scholarscrib:last-active";

export type Encouragement = { title: string; body: string };

export const ENCOURAGEMENTS: readonly Encouragement[] = [
  {
    title: "You've got this!",
    body: "Every question you practise helps you feel more prepared for exam day. Keep going!",
  },
  {
    title: "Small steps, big progress",
    body: "You don't have to do everything today. A little focused effort still counts.",
  },
  {
    title: "Mistakes help you grow",
    body: "Getting an answer wrong isn't failure. It's a chance to understand the topic better.",
  },
  {
    title: "Consistency is your superpower",
    body: "You don't need to study for hours every day. Keep showing up, and your effort will add up.",
  },
  {
    title: "Look how far you've come",
    body: "You've learned things you didn't know before. Give yourself credit for that progress.",
  },
  {
    title: "One topic at a time",
    body: "You don't need to master every subject at once. Pick one topic, focus, and take it from there.",
  },
  {
    title: "Your future self says thanks",
    body: "The time you spend learning today is a gift to the person you're becoming.",
  },
  {
    title: "It's okay to start small",
    body: "Not sure where to begin? Try just five questions. Starting is already a win.",
  },
  {
    title: "You're learning, not competing",
    body: "Your journey is yours. Focus on becoming better than you were yesterday.",
  },
  {
    title: "Challenge accepted!",
    body: "Some questions are tough. Take a breath, think it through, and give it your best shot.",
  },
  {
    title: "Progress over perfection",
    body: "You won't get everything right every time, and that's okay. Keep learning and improving.",
  },
  {
    title: "Every question counts",
    body: "Each question you attempt gives you another chance to practise, learn, and build confidence.",
  },
  {
    title: "Take a breath",
    body: "Feeling overwhelmed? Pause for a moment. You can slow down, regroup, and try again.",
  },
  {
    title: "You are capable of more",
    body: "A difficult topic doesn't define your ability. Give yourself time to understand it.",
  },
  {
    title: "Build your confidence",
    body: "The more you practise, the more familiar questions become. Keep building that confidence!",
  },
  {
    title: "Your effort matters",
    body: "Even when progress feels slow, the work you're putting in is worth it. Don't give up on yourself.",
  },
  {
    title: "Make today count",
    body: "You don't need a perfect study day. Just choose one useful thing to learn and get started.",
  },
  {
    title: "Ready for the next level?",
    body: "You've completed one step. Keep the momentum going and see what else you can learn.",
  },
  {
    title: "Rest is part of the plan",
    body: "Your brain needs breaks too. Take time to rest, recharge, and return ready to learn.",
  },
  {
    title: "Turn confusion into clarity",
    body: "If a topic doesn't make sense yet, revisit it. Understanding often comes one step at a time.",
  },
  {
    title: "Exam confidence starts here",
    body: "Every practice session helps you become more familiar with the questions you'll face. Keep preparing!",
  },
  {
    title: "Celebrate the little wins",
    body: "Got one more question right? Finally understood a tricky topic? That's progress worth celebrating.",
  },
  {
    title: "Don't let one score define you",
    body: "A practice score shows you what to work on next. It doesn't decide what you're capable of achieving.",
  },
  {
    title: "Keep believing in yourself",
    body: "You may not have everything figured out yet, but you can keep learning, improving, and moving forward.",
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
