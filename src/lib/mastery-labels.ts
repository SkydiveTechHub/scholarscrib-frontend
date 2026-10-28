// Plain-language meaning of the topic standings on the Performance page.
// The numbers mirror the backend (evidence.py): STRONG_MASTERY 85,
// WEAK_MASTERY 50, TARGET 70, MASTERY_MIN_QUESTIONS 7, MASTERY_MIN_DAYS 2.

export const MASTERY_LABEL_HELP: readonly { label: string; meaning: string }[] = [
  { label: "Strong", meaning: "Your answers on this topic are about 85% or better." },
  { label: "Normal", meaning: "Your answers are between 50% and 85%. Steady practice will lift it." },
  { label: "Weak", meaning: "Under 50% so far. A short lesson review and more practice usually helps." },
  { label: "Emerging", meaning: "Not enough answers yet to say. Answer a few more and a label appears." },
];

export const MASTERY_RULE =
  "A topic counts as mastered when you score 70% or more across at least 7 questions, on at least 2 different days. One good quiz is not enough.";
