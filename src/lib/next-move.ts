import type { DashboardSession } from "@/lib/api/types";
import { sessionActionLabel, sessionItemHref } from "@/lib/session-links";

type SubjectMap = Record<string, { slug: string; name: string; code: string }>;

export type NextMove = {
  /**
   * personalized: chosen from today's session, which is built from the
   * student's own plan and evidence. generic: a safe starter that makes no
   * claim about the student. done: today's session is finished.
   */
  kind: "personalized" | "generic" | "done";
  title: string;
  reason: string;
  /** Only when the session supplies it; never invented. */
  minutes: number | null;
  href: string;
  cta: string;
};

const GENERIC: NextMove = {
  kind: "generic",
  title: "Try a few practice questions",
  reason: "A short practice set is a good way to get started.",
  minutes: null,
  href: "/practice",
  cta: "Start practising",
};

/**
 * One suggested action. It reuses today's session, which already weighs the
 * study plan, due flashcards, topics needing revision and unfinished lessons,
 * so there is a single recommendation engine rather than two. Items that
 * cannot be opened are skipped.
 */
export function pickNextMove(
  session: DashboardSession | null | undefined,
  subjects: SubjectMap,
  hasActivity: boolean,
): NextMove {
  if (!hasActivity || !session || session.items.length === 0) return GENERIC;

  for (const item of session.items) {
    if (item.doneAt) continue;
    const href = sessionItemHref(item, subjects);
    if (!href) continue;
    return {
      kind: "personalized",
      title: item.title,
      reason: item.reason,
      minutes: item.minutes > 0 ? item.minutes : null,
      href,
      cta: sessionActionLabel(item),
    };
  }

  const allDone = session.items.every((item) => item.doneAt);
  if (allDone) {
    return {
      kind: "done",
      title: "Today's session is done",
      reason: "Nice work. If you want more, a few past questions are always useful.",
      minutes: null,
      href: "/practice/past-questions",
      cta: "Try past questions",
    };
  }
  return GENERIC;
}
