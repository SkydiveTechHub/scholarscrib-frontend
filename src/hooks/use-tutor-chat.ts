"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { reloadTutorThread, useTutorFeedback } from "@/hooks/api/use-tutor";
import { clearStudentToken } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { chatReducer, initialChatState } from "@/lib/tutor/chat-state";
import { streamTutorReply } from "@/lib/tutor/client";
import type {
  TutorAction,
  TutorMessage,
  TutorSendRequest,
} from "@/lib/tutor/types";

/**
 * Owns one open conversation. Mount it only once the thread has loaded and
 * `key` the parent by thread, so the reducer starts from the server's messages
 * and is replaced -- never patched -- when the context changes.
 */
export function useTutorChat({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: TutorMessage[];
}) {
  const [state, dispatch] = useReducer(
    chatReducer,
    initialMessages,
    initialChatState,
  );
  const abortRef = useRef<AbortController | null>(null);
  const { mutate: sendFeedback } = useTutorFeedback();

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (request: TutorSendRequest) => {
      const pendingUserId = crypto.randomUUID();
      dispatch({ type: "send", request, pendingUserId });
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        for await (const event of streamTutorReply(
          { threadId, content: request.text },
          { signal: controller.signal },
        )) {
          dispatch({ type: "event", event });
        }
      } catch (err) {
        if (controller.signal.aborted) {
          try {
            const reloaded = await reloadTutorThread(threadId);
            dispatch({ type: "reconcile", messages: reloaded.messages });
          } catch {
            dispatch({ type: "stopped" });
          }
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
      }
    },
    [threadId],
  );

  const send = useCallback(
    (req: { text: string; action: TutorAction | null }) => {
      void run(req);
    },
    [run],
  );

  const retry = useCallback(() => {
    if (state.lastRequest) void run(state.lastRequest);
  }, [run, state.lastRequest]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const rate = useCallback(
    (messageId: string, rating: "up" | "down") => {
      dispatch({ type: "rate", messageId, rating });
      sendFeedback({ messageId, rating });
    },
    [sendFeedback],
  );

  return { state, send, retry, stop, rate };
}
