"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { reloadTutorThread, useTutorFeedback } from "@/hooks/api/use-tutor";
import { queryKeys } from "@/lib/api/query-keys";
import { clearStudentToken } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { request } from "@/lib/api/http";
import {
  chatReducer,
  initialChatState,
  storedReplyIsNew,
  turnLanded,
} from "@/lib/tutor/chat-state";
import {
  streamTutorAction,
  streamTutorReply,
  streamTutorRun,
} from "@/lib/tutor/client";
import {
  browserEventStorage,
  createEventCursor,
  type EventCursor,
} from "@/lib/tutor/event-cursor";
import type {
  ActiveRun,
  TutorAction,
  TutorMessage,
  TutorSendRequest,
  TutorStreamEvent,
  TutorThreadCreateBody,
} from "@/lib/tutor/types";

type Outcome = "done" | "stopped" | "failed" | "dropped" | "finished";

const DROP_MESSAGE = "The connection dropped before Astra finished.";

/**
 * Owns one open conversation. Mount it only once the thread has loaded (or is
 * known not to exist yet) and `key` the parent by conversation, so the reducer
 * starts from the server's messages and is replaced -- never patched -- when
 * the context changes. A new conversation creates its thread on first send.
 */
export function useTutorChat({
  threadId: initialThreadId,
  initialMessages,
  activeRun,
  createBody,
  onThreadStarted,
}: {
  /** Null for a new conversation: the server creates the thread with the first message. */
  threadId: string | null;
  initialMessages: TutorMessage[];
  /** Set when the thread GET says a graph run is still going. */
  activeRun: ActiveRun | null;
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
  const messagesRef = useRef(state.messages);
  const resumeLock = useRef(false);
  const genRef = useRef(0);
  const cursors = useRef(new Map<string, EventCursor>());
  const onThreadStartedRef = useRef(onThreadStarted);
  const { mutate: sendFeedback } = useTutorFeedback();
  const queryClient = useQueryClient();
  const router = useRouter();

  function cursorFor(threadId: string): EventCursor {
    let cursor = cursors.current.get(threadId);
    if (!cursor) {
      cursor = createEventCursor(threadId, browserEventStorage());
      cursors.current.set(threadId, cursor);
    }
    return cursor;
  }

  function acceptEvent(event: TutorStreamEvent): boolean {
    if (event.type === "streamStarted" && !threadIdRef.current) {
      threadIdRef.current = event.threadId;
      onThreadStartedRef.current(event.threadId);
    }
    const threadId = threadIdRef.current;
    if (!threadId || !event.eventId) return true;
    const cursor = cursorFor(threadId);
    if (!cursor.accept(event.eventId)) return false;
    return true;
  }

  function replaceStream() {
    const gen = ++genRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return { gen, controller };
  }

  async function pump(
    source: AsyncGenerator<TutorStreamEvent>,
    gen: number,
    allowRecover: boolean,
    onEvent?: (event: TutorStreamEvent) => void,
  ): Promise<Outcome> {
    const controller = abortRef.current;
    try {
      for await (const event of source) {
        if (gen !== genRef.current) return "stopped";
        if (!acceptEvent(event)) continue;
        if (gen !== genRef.current) return "stopped";
        if (event.type === "error" && event.code === "RUN_FINISHED") {
          return "finished";
        }
        if (event.type === "error" && event.dropped) {
          return allowRecover ? "dropped" : "failed";
        }
        onEvent?.(event);
        dispatch({ type: "event", event });
        if (event.type === "done") return "done";
        if (event.type === "error") return "failed";
      }
      return "done";
    } catch (err) {
      if (gen !== genRef.current || controller?.signal.aborted) return "stopped";
      if (isApiError(err) && err.isAuthFailure) {
        clearStudentToken();
        window.location.assign("/login?reason=session");
        return "failed";
      }
      if (allowRecover) return "dropped";
      return "failed";
    }
  }

  function failDrop() {
    dispatch({
      type: "failed",
      error: {
        code: "UNAVAILABLE",
        message: threadIdRef.current
          ? DROP_MESSAGE
          : "Couldn't reach Astra. Check your connection and try again.",
      },
    });
  }

  async function settleDrop(gen: number): Promise<boolean> {
    const threadId = threadIdRef.current;
    if (!threadId || gen !== genRef.current) return gen !== genRef.current;
    dispatch({ type: "reconnecting" });
    let thread;
    try {
      thread = await reloadTutorThread(threadId);
    } catch {
      return false;
    }
    if (gen !== genRef.current) return true;

    if (thread.activeRun?.status === "running") {
      const controller = new AbortController();
      abortRef.current = controller;
      const outcome = await pump(
        streamTutorRun(
          {
            threadId,
            runId: thread.activeRun.runId,
            lastEventId: cursorFor(threadId).lastId(),
          },
          { signal: controller.signal },
        ),
        gen,
        false,
      );
      if (
        gen !== genRef.current ||
        outcome === "stopped" ||
        outcome === "done"
      ) {
        return true;
      }
      try {
        thread = await reloadTutorThread(threadId);
      } catch {
        return false;
      }
      if (gen !== genRef.current) return true;
    }

    if (thread.activeRun?.status === "running") return false;
    if (storedReplyIsNew(messagesRef.current, thread.messages)) {
      dispatch({ type: "reconcile", messages: thread.messages });
      cursorFor(threadId).clear();
      return true;
    }
    if (turnLanded(messagesRef.current) || pendingRef.current) {
      dispatch({ type: "event", event: { type: "done" } });
      return true;
    }
    return false;
  }

  const live = useRef({ pump, settleDrop, failDrop });

  useEffect(() => {
    pendingRef.current = state.pendingAction;
    phaseRef.current = state.phase;
    resumingRef.current = state.resuming;
    messagesRef.current = state.messages;
    onThreadStartedRef.current = onThreadStarted;
    live.current = { pump, settleDrop, failDrop };
  });

  useEffect(() => {
    return () => {
      genRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!initialThreadId || activeRun?.status !== "running") return;
    const threadId = initialThreadId;
    const runId = activeRun.runId;
    const gen = ++genRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "reconnecting" });
    let cancelled = false;
    void (async () => {
      const outcome = await live.current.pump(
        streamTutorRun(
          {
            threadId,
            runId,
            lastEventId: cursorFor(threadId).lastId(),
          },
          { signal: controller.signal },
        ),
        gen,
        false,
      );
      if (cancelled || gen !== genRef.current) return;
      if (outcome === "done" || outcome === "stopped") return;
      const ok = await live.current.settleDrop(gen);
      if (!ok && !cancelled && gen === genRef.current) live.current.failDrop();
    })();
    return () => {
      cancelled = true;
      if (abortRef.current === controller) controller.abort();
    };
  }, [activeRun?.runId, activeRun?.status, initialThreadId]);

  const run = useCallback(
    async (sendRequest: TutorSendRequest) => {
      if (pendingRef.current || resumeLock.current) return;
      const existing = threadIdRef.current;
      if (existing) cursorFor(existing).clear();
      const { gen, controller } = replaceStream();
      const pendingUserId = crypto.randomUUID();
      dispatch({ type: "send", request: sendRequest, pendingUserId });
      const outcome = await live.current.pump(
        streamTutorReply(
          {
            threadId: threadIdRef.current,
            create: createBody,
            content: sendRequest.text,
          },
          { signal: controller.signal },
        ),
        gen,
        true,
      );
      if (gen !== genRef.current) return;
      if (outcome !== "stopped") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tutor.history(),
        });
      }
      if (outcome === "dropped" || outcome === "finished") {
        const ok = await live.current.settleDrop(gen);
        if (!ok && gen === genRef.current) live.current.failDrop();
      }
    },
    [createBody, queryClient],
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
    (approved: boolean, args?: Record<string, unknown>) => {
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
      cursorFor(threadId).clear();
      const { gen, controller } = replaceStream();
      resumeLock.current = true;
      dispatch({ type: "resume" });
      void (async () => {
        try {
          const outcome = await live.current.pump(
            streamTutorAction(
              {
                threadId,
                approved,
                actionId: proposal.actionId,
                args: approved ? (args ?? null) : null,
              },
              { signal: controller.signal },
            ),
            gen,
            true,
            (event) => {
              if (event.type === "actionExecuted") {
                router.refresh();
                void queryClient.invalidateQueries({
                  queryKey: queryKeys.studyPlan.all,
                });
              }
            },
          );
          if (gen !== genRef.current) return;
          if (outcome === "dropped" || outcome === "finished") {
            const ok = await live.current.settleDrop(gen);
            if (!ok && gen === genRef.current) {
              dispatch({
                type: "failed",
                error: {
                  code: "ACTION_RESUME",
                  message: "Couldn't confirm that change. You can try again.",
                },
              });
            }
          }
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
    genRef.current += 1;
    const threadId = threadIdRef.current;
    if (threadId) {
      cursorFor(threadId).clear();
      request({
        method: "POST",
        url: endpoints.tutor.messagesStop(threadId),
      }).catch(() => {});
    }
    abortRef.current?.abort();
    dispatch({ type: "stopped" });
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
