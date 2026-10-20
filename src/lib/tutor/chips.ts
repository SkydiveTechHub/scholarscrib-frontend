import type { TutorAction, TutorContext } from "./types";

export type Chip = { label: string; action: TutorAction | null; text: string };

const chip = (
  label: string,
  action: TutorAction | null = null,
  text = label,
): Chip => ({ label, action, text });

export function startersFor(c: TutorContext): Chip[] {
  switch (c.type) {
    case "lesson":
    case "topic":
      return [
        chip("Explain simply", "explain_simply", "Explain this simply"),
        chip("Give an example", "example", "Give me an example"),
        chip("Test me", "test_me", "Test me on this"),
        chip("Why does this matter?"),
      ];
    case "question":
      return [
        chip("Explain the answer", null, "Explain the answer to this question"),
        chip("Show me the steps", null, "Show me the steps"),
        chip("Give me a similar one", null, "Give me a similar question"),
      ];
    default:
      return [
        chip("Help me study", null, "Help me plan my study"),
        chip("Explain a topic", null, "Explain a topic to me"),
        chip("Quiz me", "test_me", "Quiz me"),
      ];
  }
}

const HINT = chip("Give me a hint", "hint_next");
const ANOTHER = chip("Another hint", "hint_next");
const REVEAL = chip("Walk me through it", "reveal");

/**
 * Hint ladder for a question the student has not answered: hint, hint, then a
 * walkthrough. Null means "not a ladder context", so callers fall back to
 * `startersFor`.
 */
export function ladderFor(c: TutorContext, hintsUsed: number): Chip[] | null {
  if (c.type !== "question" || c.attemptId) return null;
  if (hintsUsed <= 0) return [HINT];
  if (hintsUsed === 1) return [ANOTHER, REVEAL];
  return [REVEAL];
}
