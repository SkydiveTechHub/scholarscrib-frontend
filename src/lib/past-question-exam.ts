// Past papers are recorded attempts: the backend fetches each page from the
// question provider, stores it, and hands back the questions without their
// answers (`POST /api/assessments/past-paper`, then `.../{attemptId}/more`).
// Grading happens on submit, server-side. This module only shapes the rows for
// the exam surface. Pure, so the shaping rules are testable.

import type { BankQuestionPageOut, QuestionOut } from "@/lib/api/types";
import type { ExamQuestion } from "@/components/assessment/exam-state";

/**
 * Questions per page on `GET /api/questions` (the endpoint caps `limit` at
 * 15). Used by the public past-question pages, which read that listing.
 */
export const PAST_PAPER_LIMIT = 15;

/**
 * The cursor for the page after this one on `GET /api/questions`, or null when
 * the paper is done. A `hasMore` without a cursor is treated as done.
 */
export function nextPageCursor(
  pagination: BankQuestionPageOut["pagination"] | null | undefined,
): string | null {
  if (!pagination) return null;
  const hasMore = pagination.hasMore ?? pagination.has_more ?? false;
  const cursor = pagination.nextCursor ?? pagination.next_cursor ?? null;
  return hasMore && cursor ? cursor : null;
}

/** Past papers run at JAMB pace, rounded up: a minute a question. */
export const SECONDS_PER_QUESTION = 60;

const LETTERS = "ABCDEFGH";

function optionText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const text = o.text ?? o.value ?? o.label;
    if (typeof text === "string") return text;
  }
  return null;
}

/**
 * Options keyed by upper-case letter, whatever the provider sent: an object
 * keyed `a`–`e`, or a bare list. Empty options are dropped, since the provider
 * pads four-option questions with a blank fifth.
 */
export function normaliseOptions(
  options: QuestionOut["options"],
): Record<string, string> | null {
  if (!options) return null;
  const entries: [string, unknown][] = Array.isArray(options)
    ? options.map((value, i) => [LETTERS[i] ?? String(i + 1), value])
    : Object.entries(options);

  const out: Record<string, string> = {};
  for (const [key, value] of entries) {
    const text = optionText(value)?.trim();
    if (text) out[key.toUpperCase()] = text;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** The comprehension passage, or null when the question has none. */
export function passageOf(q: QuestionOut): string | null {
  const passage = typeof q.passage === "string" ? q.passage.trim() : "";
  return q.hasPassage && passage ? passage : null;
}

/** The group instruction, or null. A passage question carries its passage instead. */
export function instructionOf(q: QuestionOut): string | null {
  const instruction = typeof q.instruction === "string" ? q.instruction.trim() : "";
  return instruction && !passageOf(q) ? instruction : null;
}

export function toExamQuestion(q: QuestionOut, index: number): ExamQuestion {
  return {
    id: q.id,
    questionNumber: q.questionNumber ?? index + 1,
    questionText: q.questionText,
    questionImageUrl: q.questionImageUrl ?? null,
    questionType: q.questionType ?? "MCQ",
    options: normaliseOptions(q.options),
    difficulty: q.difficulty ?? "MEDIUM",
    marks: q.marks ?? 1,
    examType: q.examType ?? "",
    examYear: q.examYear ?? null,
    passage: passageOf(q),
    instruction: instructionOf(q),
    ...(q.subjectName ? { subjectName: q.subjectName } : {}),
    ...(q.subjectCode ? { subjectCode: q.subjectCode } : {}),
  };
}
