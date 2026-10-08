"use client";

import { useMutation } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";

export type TopicAnswer = {
  questionId: string;
  /** Marked server-side against the stored answer. */
  selectedAnswer?: string;
  /** Practice lets a student retry until right, so only this says if they got it first go. */
  firstTry?: boolean;
};

/**
 * Records answers to a topic's questions as mastery evidence. Fire-and-forget
 * by design: the quiz is a self-check and must never be blocked or interrupted
 * by a failed save, so callers use `mutate` and ignore the outcome.
 */
export function useRecordTopicAnswers() {
  return useMutation({
    mutationFn: (input: {
      subjectSlug: string;
      topicSlug: string;
      answers: TopicAnswer[];
    }) =>
      request<{ recorded: number }>({
        method: "POST",
        url: endpoints.questions.topicAnswers,
        data: {
          subjectId: input.subjectSlug,
          topic: input.topicSlug,
          answers: input.answers,
        },
      }),
  });
}
