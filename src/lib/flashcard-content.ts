// Flashcard card types and their labels. Decks are generated and linted on the
// backend. See docs/superpowers/specs/2026-08-01-flashcards-design.md.

export type FlashcardType =
  | "DEFINITION"
  | "FORMULA"
  | "IMAGE"
  | "DIAGRAM"
  | "FILL_IN_BLANK"
  | "COMPARE_CONTRAST"
  | "TRUE_FALSE"
  | "SCENARIO"
  | "PROCESS";

// ─── Typed payloads ─────────────────────────────────────────

/**
 * Cards built from a lesson carry a plain `{ front, back }` payload (markdown
 * prose lifted straight from the lesson blocks), whatever their card type.
 * They have no structured fields to render, so they study as front/back.
 */
export function frontBack(
  payload: unknown,
): { front: string; back: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const { front, back } = payload as Record<string, unknown>;
  return typeof front === "string" && typeof back === "string"
    ? { front, back }
    : null;
}

/** Only structured fill-in / true-false cards are graded on the card itself. */
export function isObjectiveCard(
  card: { cardType: FlashcardType; payload: unknown } | undefined,
): boolean {
  if (!card || frontBack(card.payload)) return false;
  return card.cardType === "FILL_IN_BLANK" || card.cardType === "TRUE_FALSE";
}

export const CARD_TYPE_LABEL: Record<FlashcardType, string> = {
  DEFINITION: "Definition",
  FORMULA: "Formula",
  IMAGE: "Image",
  DIAGRAM: "Diagram",
  FILL_IN_BLANK: "Fill in the blank",
  COMPARE_CONTRAST: "Compare & contrast",
  TRUE_FALSE: "True or false",
  SCENARIO: "Scenario",
  PROCESS: "Process",
};

export const CARD_TYPE_BADGE: Record<FlashcardType, string> = {
  DEFINITION: "blue",
  FORMULA: "purple",
  IMAGE: "teal",
  DIAGRAM: "amber",
  FILL_IN_BLANK: "green",
  COMPARE_CONTRAST: "orange",
  TRUE_FALSE: "red",
  SCENARIO: "purple",
  PROCESS: "teal",
};
