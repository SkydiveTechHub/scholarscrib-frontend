"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearStudentToken } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import { chatReducer, initialChatState } from "@/lib/tutor/chat-state";
import { streamTutorReply } from "@/lib/tutor/client";
import type {
  TutorAction,
  TutorContext,
  TutorMessage,
  TutorSendRequest,
} from "@/lib/tutor/types";
import { useTutorFeedback } from "@/hooks/api/use-tutor";

/**
 * Owns one open conversation. Mount it only once the thread has loaded and
 * `key` the parent by thread, so the reducer starts from the server's messages
 * and is replaced -- never patched -- when the context changes.
 */
export function useTutorChat({
  threadId,
  context,
  initialMessages,
}: {
  threadId: string;
  context: TutorContext;
  initialMessages: TutorMessage[];
}) {
  const [state, dispatch] = useReducer(
    chatReducer,
    initialMessages,
    initialChatState,
  );
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const { mutate: sendFeedback } = useTutorFeedback();

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (request: TutorSendRequest) => {
      dispatch({ type: "send", request });
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        for await (const event of streamTutorReply(
          { threadId, context, ...request },
          { signal: controller.signal },
        )) {
          dispatch({ type: "event", event });
        }
      } catch (err) {
        if (controller.signal.aborted) {
          dispatch({ type: "stopped" });
        } else if (isApiError(err) && err.isAuthFailure) {
          clearStudentToken();
          window.location.assign("/login?reason=session");
        } else {
          dispatch({
            type: "failed",
            error: {
              code: "UNAVAILABLE",
              message:
                "Couldn't reach Astra. Check your connection and try again.",
            },
          });
        }
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.tutor.status() });
      }
    },
    [threadId, context, queryClient],
  );

  const send = useCallback(
    (req: { text: string; action: TutorAction | null }) => {
      void run({ ...req, clientMessageId: crypto.randomUUID() });
    },
    [run],
  );

  const retry = useCallback(() => {
    if (state.lastRequest) void run(state.lastRequest);
  }, [run, state.lastRequest]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const rate = useCallback(
    (messageId: string, rating: "up" | "down") => {
      dispatch({ type: "rate", messageId, rating });
      sendFeedback({ messageId, rating });
    },
    [sendFeedback],
  );

  return { state, send, retry, stop, rate };
}
