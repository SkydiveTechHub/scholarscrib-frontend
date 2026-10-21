import type { TutorContext, TutorThreadCreateBody } from "./types";

/**
 * One thread per key in the session cache. An `attemptId` is deliberately not
 * part of it: the thread is per question (or lesson), and the attempt only
 * informs wrong-answer context when creating.
 */
export function contextKey(c: TutorContext): string {
  switch (c.type) {
    case "lesson":
      return `lesson:${c.lessonId}`;
    case "question":
      return `question:${c.questionId}`;
    case "topic":
      return `topic:${c.subjectSlug}/${c.topicSlug}`;
    default:
      return "general";
  }
}

/** Body for `POST /api/tutor/threads` when not using the lesson shortcut. */
export function createBodyFor(c: TutorContext): TutorThreadCreateBody {
  switch (c.type) {
    case "lesson":
      return {
        lessonId: c.lessonId,
        ...(c.subjectId ? { subjectId: c.subjectId } : {}),
        ...(c.topicId ? { topicId: c.topicId } : {}),
      };
    case "question":
      return {
        questionId: c.questionId,
        ...(c.subjectId ? { subjectId: c.subjectId } : {}),
        ...(c.topicId ? { topicId: c.topicId } : {}),
        ...(c.wrongAnswerContext
          ? { wrongAnswerContext: c.wrongAnswerContext }
          : {}),
      };
    default:
      return {};
  }
}

export function statusLabel(node: string): string {
  switch (node) {
    case "classify_intent":
      return "Understanding your question…";
    case "grade_documents":
      return "Checking lesson notes…";
    case "ground_answer":
      return "Verifying the answer…";
    case "remember":
      return "Saving what helps you…";
    default:
      return "Thinking…";
  }
}
