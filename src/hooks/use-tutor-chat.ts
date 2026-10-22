"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTutorFeedback } from "@/hooks/api/use-tutor";
import { queryKeys } from "@/lib/api/query-keys";
import { clearStudentToken } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { request } from "@/lib/api/http";
import { chatReducer, initialChatState } from "@/lib/tutor/chat-state";
import { streamTutorAction, streamTutorReply } from "@/lib/tutor/client";
import type {
  TutorAction,
  TutorMessage,
  TutorSendRequest,
  TutorThreadCreateBody,
} from "@/lib/tutor/types";

/**
 * Owns one open conversation. Mount it only once the thread has loaded (or is
 * known not to exist yet) and `key` the parent by conversation, so the reducer
 * starts from the server's messages and is replaced -- never patched -- when
 * the context changes. A new conversation creates its thread on first send.
 */
export function useTutorChat({
  threadId: initialThreadId,
  initialMessages,
  createBody,
  onThreadStarted,
}: {
  /** Null for a new conversation: the server creates the thread with the first message. */
  threadId: string | null;
  initialMessages: TutorMessage[];
  /** Scope for the thread a new conversation will create. */
  createBody: TutorThreadCreateBody;
  onThreadStarted: (threadId: string) => void;
}) {
  const [state, dispatch] = useReducer(
    chatReducer,
    initialMessages,
    initialChatState,
  );
  const abortRef = useRef<AbortController | null>(null);
  const threadIdRef = useRef(initialThreadId);
  const pendingRef = useRef(state.pendingAction);
  const phaseRef = useRef(state.phase);
  const resumingRef = useRef(state.resuming);
  const resumeLock = useRef(false);
  pendingRef.current = state.pendingAction;
  phaseRef.current = state.phase;
  resumingRef.current = state.resuming;
  const { mutate: sendFeedback } = useTutorFeedback();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (request: TutorSendRequest) => {
      if (pendingRef.current || resumeLock.current) return;
      const pendingUserId = crypto.randomUUID();
      dispatch({ type: "send", request, pendingUserId });
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        for await (const event of streamTutorReply(
          {
            threadId: threadIdRef.current,
            create: createBody,
            content: request.text,
          },
          { signal: controller.signal },
        )) {
          if (event.type === "streamStarted" && !threadIdRef.current) {
            threadIdRef.current = event.threadId;
            onThreadStarted(event.threadId);
          }
          dispatch({ type: "event", event });
        }
        // The server names the thread when the first message lands, so the
        // history list fetched at creation still has the placeholder title.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tutor.history(),
        });
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
    [createBody, onThreadStarted, queryClient],
  );

  const send = useCallback(
    (req: { text: string; action: TutorAction | null }) => {
      void run(req);
    },
    [run],
  );

  const retry = useCallback(() => {
    if (pendingRef.current || resumeLock.current) return;
    if (state.lastRequest) void run(state.lastRequest);
  }, [run, state.lastRequest]);

  const resolve = useCallback(
    (approved: boolean) => {
      const proposal = pendingRef.current;
      const threadId = threadIdRef.current;
      if (
        !proposal ||
        !threadId ||
        resumeLock.current ||
        phaseRef.current === "streaming"
      ) {
        return;
      }
      resumeLock.current = true;
      dispatch({ type: "resume" });
      const controller = new AbortController();
      abortRef.current = controller;
      void (async () => {
        try {
          for await (const event of streamTutorAction(
            {
              threadId,
              approved,
              actionId: proposal.actionId,
              args: null,
            },
            { signal: controller.signal },
          )) {
            if (event.type === "actionExecuted") {
              router.refresh();
              void queryClient.invalidateQueries({
                queryKey: queryKeys.studyPlan.all,
              });
            }
            dispatch({ type: "event", event });
          }
        } catch (err) {
          if (isApiError(err) && err.isAuthFailure) {
            clearStudentToken();
            window.location.assign("/login?reason=session");
            return;
          }
          dispatch({
            type: "failed",
            error: {
              code: "ACTION_RESUME",
              message: "Couldn't confirm that change. You can try again.",
            },
          });
        } finally {
          resumeLock.current = false;
        }
      })();
    },
    [queryClient, router],
  );

  const stop = useCallback(() => {
    // A resume already sent the choice; aborting it would not undo the write.
    if (resumingRef.current || resumeLock.current) return;
    // Tell the server to cancel generation, and close our end of the stream.
    const threadId = threadIdRef.current;
    if (threadId) {
      request({
        method: "POST",
        url: endpoints.tutor.messagesStop(threadId),
      }).catch(() => {});
    }
    abortRef.current?.abort();
  }, []);

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

  return { state, send, retry, stop, edit, rate, resolve };
}
