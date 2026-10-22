"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useTutorFeedback } from "@/hooks/api/use-tutor";
import { clearStudentToken } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { request } from "@/lib/api/http";
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
          // The student stopped it. Keep the turn on screen rather than
          // reloading: the server discards a cancelled turn, so a reload
          // would wipe the question they want to edit or resend.
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
    // Tell the server to cancel generation, and close our end of the stream.
    request({
      method: "POST",
      url: endpoints.tutor.messagesStop(threadId),
    }).catch(() => {});
    abortRef.current?.abort();
  }, [threadId]);

  /** Drops a stopped turn and returns its text for the composer. */
  const edit = useCallback(
    (messageId: string): string | null => {
      const target = state.messages.find((m) => m.id === messageId);
      if (!target?.stopped || target.role !== "student") return null;
      dispatch({ type: "edit", messageId });
      return target.text;
    },
    [state.messages],
  );

  const rate = useCallback(
    (messageId: string, rating: "up" | "down") => {
      dispatch({ type: "rate", messageId, rating });
      sendFeedback({ messageId, rating });
    },
    [sendFeedback],
  );

  return { state, send, retry, stop, edit, rate };
}
