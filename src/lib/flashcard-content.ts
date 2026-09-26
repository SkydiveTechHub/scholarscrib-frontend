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
