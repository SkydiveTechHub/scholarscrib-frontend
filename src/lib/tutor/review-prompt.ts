export type ReviewQuestion = {
  questionText: string;
  options: Record<string, string> | null;
  correctAnswer: string;
  selectedAnswer: string | null;
};

/**
 * The first message sent when a student taps "Explain this" on a marked
 * question: the question, every option, what they chose and the right answer,
 * so Astra can say why the right one is right and why each other one is wrong.
 */
export function reviewPrompt(q: ReviewQuestion): string {
  const lines = [`Question: ${q.questionText.trim()}`];
  if (q.options) {
    lines.push("", "Options:");
    for (const [key, value] of Object.entries(q.options)) {
      lines.push(`${key}. ${value}`);
    }
  }
  lines.push("", `Correct answer: ${q.correctAnswer}`);
  const chose = q.selectedAnswer
    ? q.selectedAnswer === q.correctAnswer
      ? `I chose ${q.selectedAnswer}, which was correct.`
      : `I chose ${q.selectedAnswer}, which was wrong.`
    : "I skipped this question.";
  lines.push(chose, "");
  lines.push(
    q.options
      ? "Explain why the correct option is right and why each of the other options is wrong."
      : "Explain why the correct answer is right.",
  );
  return lines.join("\n");
}
