export const PAPER_MIN_QUESTIONS = 10;

/** How many worked questions each page shows before the gate. */
export const TOPIC_SAMPLE_COUNT = 3;
export const PAPER_SAMPLE_COUNT = 5;

export function isPaperPageEligible({
  publicQuestionCount,
}: {
  publicQuestionCount: number;
}): boolean {
  return publicQuestionCount >= PAPER_MIN_QUESTIONS;
}
