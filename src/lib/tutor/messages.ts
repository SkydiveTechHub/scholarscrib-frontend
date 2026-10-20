import type { TutorErrorInfo } from "./types";

/** "at 6:30 PM", "tomorrow", or "tomorrow at 6:00 AM" -- never a bare "00:00". */
export function resetPhrase(iso: string | null | undefined, now: Date): string {
  if (!iso) return "tomorrow";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "tomorrow";

  const time = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (at.toDateString() === now.toDateString()) return `at ${time}`;
  const midnight = at.getHours() === 0 && at.getMinutes() === 0;
  return midnight ? "tomorrow" : `tomorrow at ${time}`;
}

/** Shown when the daily allowance is spent, whether or not a request just failed. */
export function exhaustedMessage(
  resetsAt: string | null | undefined,
  now: Date,
): string {
  return `You've used today's questions. Astra is back ${resetPhrase(resetsAt, now)}.`;
}

export type ErrorView = { message: string; retry: boolean; upgrade: boolean };

/** What the thread says about a failure, and which action (if any) can help. */
export function describeError(error: TutorErrorInfo, now: Date): ErrorView {
  switch (error.code) {
    case "RATE_LIMITED":
      return {
        message: exhaustedMessage(error.resetsAt, now),
        retry: false,
        upgrade: false,
      };
    case "TIER_REQUIRED":
      return {
        message: "Astra is part of Premium.",
        retry: false,
        upgrade: true,
      };
    case "CONTEXT_NOT_FOUND":
      return {
        message:
          "Astra can't find that item any more. Close this and open Astra again from the lesson.",
        retry: false,
        upgrade: false,
      };
    default:
      return { message: error.message, retry: true, upgrade: false };
  }
}
