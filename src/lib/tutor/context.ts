import type { TutorContext } from "./types";

export function threadParams(c: TutorContext): {
  type: TutorContext["type"];
  id: string;
} {
  switch (c.type) {
    case "lesson":
      return { type: "lesson", id: c.lessonId };
    case "question":
      return { type: "question", id: c.questionId };
    case "topic":
      return { type: "topic", id: `${c.subjectSlug}/${c.topicSlug}` };
    default:
      return { type: "general", id: "" };
  }
}

/**
 * One thread per key: `(student, context)` on the BE, this string in the
 * cache. An `attemptId` is deliberately not part of it: the thread is per
 * question, and the attempt only tells the BE the question has been answered.
 */
export function contextKey(c: TutorContext): string {
  const { type, id } = threadParams(c);
  return id ? `${type}:${id}` : type;
}
