"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearTutorToken } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { getCenterAstraThread } from "@/lib/center-astra/api";
import {
  astraReducer,
  initialAstraState,
  storedReplyIsNew,
  turnLanded,
} from "@/lib/center-astra/chat-state";
import {
  stopCenterAstraRun,
  streamCenterAstraAction,
  streamCenterAstraReply,
  streamCenterAstraRun,
} from "@/lib/center-astra/client";
import {
  browserEventStorage,
  createCenterEventCursor,
  type CenterEventCursor,
} from "@/lib/center-astra/event-cursor";
import type { ActiveRun, AstraMessage, AstraStreamEvent } from "@/lib/center-astra/types";

type Outcome = "done" | "stopped" | "failed" | "dropped" | "finished" | "running";

const DROP_MESSAGE = "The connection dropped before Astra finished.";

/**
 * One open center Astra thread. Parent keys by centerId + threadId so a
 * different conversation mounts fresh from the server transcript.
 */
export function useCenterAstraChat({
  centerId,
  threadId: initialThreadId,
  initialMessages,
  activeRun,
  onTitle,
  onTokensSpent,
}: {
  centerId: string;
  threadId: string;
  initialMessages: AstraMessage[];
  activeRun: ActiveRun;
  onTitle: (title: string) => void;
  /** Fired after a turn completes so the token balance can refresh. */
  onTokensSpent?: () => void;
}) {
  const [state, dispatch] = useReducer(astraReducer, initialMessages, initialAstraState);
  const abortRef = useRef<AbortController | null>(null);
  const centerIdRef = useRef(centerId);
  const threadIdRef = useRef(initialThreadId);
  const runIdRef = useRef<string | null>(activeRun?.runId ?? null);
  const pendingRef = useRef(state.pendingAction);
  const phaseRef = useRef(state.phase);
  const resumingRef = useRef(state.resuming);
  const messagesRef = useRef(state.messages);
  const resumeLock = useRef(false);
  const genRef = useRef(0);
  const cursors = useRef(new Map<string, CenterEventCursor>());
  const onTitleRef = useRef(onTitle);
  const onTokensSpentRef = useRef(onTokensSpent);
  const router = useRouter();

  function cursorKey(center: string, thread: string) {
    return `${center}:${thread}`;
  }

  function cursorFor(center: string, threadId: string): CenterEventCursor {
    const key = cursorKey(center, threadId);
    let cursor = cursors.current.get(key);
    if (!cursor) {
      cursor = createCenterEventCursor(center, threadId, browserEventStorage());
      cursors.current.set(key, cursor);
    }
    return cursor;
  }

  function acceptEvent(event: AstraStreamEvent): boolean {
    if (event.type === "streamStarted") {
      runIdRef.current = event.runId;
      if (event.threadTitle) onTitleRef.current(event.threadTitle);
    }
    const threadId = threadIdRef.current;
    const center = centerIdRef.current;
    if (!threadId || !event.eventId) return true;
    return cursorFor(center, threadId).accept(event.eventId);
  }

  function replaceStream() {
    const gen = ++genRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return { gen, controller };
  }

  async function pump(
    source: AsyncGenerator<AstraStreamEvent>,
    gen: number,
    allowRecover: boolean,
  ): Promise<Outcome> {
    const controller = abortRef.current;
    try {
      for await (const event of source) {
        if (gen !== genRef.current) return "stopped";
        if (!acceptEvent(event)) continue;
        if (gen !== genRef.current) return "stopped";
        if (event.type === "error" && event.code === "RUN_FINISHED") return "finished";
        if (event.type === "error" && event.code === "CONFLICT" && event.running) {
          return "running";
        }
        if (event.type === "error" && event.dropped) return allowRecover ? "dropped" : "failed";
        dispatch({ type: "event", event });
        if (event.type === "actionExecuted") {
          router.refresh();
          onTokensSpentRef.current?.();
        }
        if (event.type === "done") {
          onTokensSpentRef.current?.();
          return "done";
        }
        if (event.type === "error") return "failed";
      }
      return "done";
    } catch (err) {
      if (gen !== genRef.current || controller?.signal.aborted) return "stopped";
      if (isApiError(err) && err.isAuthFailure) {
        clearTutorToken();
        window.location.assign("/center/login?reason=session");
        return "failed";
      }
      return allowRecover ? "dropped" : "failed";
    }
  }

  function failDrop() {
    dispatch({
      type: "failed",
      error: { code: "UNAVAILABLE", message: DROP_MESSAGE },
    });
  }

  async function settleDrop(gen: number): Promise<boolean> {
    const threadId = threadIdRef.current;
    const center = centerIdRef.current;
    if (!threadId || gen !== genRef.current) return gen !== genRef.current;
    dispatch({ type: "reconnecting" });
    let thread;
    try {
      thread = await getCenterAstraThread(center, threadId);
    } catch {
      return false;
    }
    if (gen !== genRef.current) return true;
    if (thread.activeRun?.status === "running") {
      runIdRef.current = thread.activeRun.runId;
      const controller = new AbortController();
      abortRef.current = controller;
      const outcome = await pump(
        streamCenterAstraRun(
          {
            centerId: center,
            threadId,
            runId: thread.activeRun.runId,
            lastEventId: cursorFor(center, threadId).lastId(),
          },
          { signal: controller.signal },
        ),
        gen,
        false,
      );
      if (gen !== genRef.current || outcome === "stopped" || outcome === "done") return true;
      try {
        thread = await getCenterAstraThread(center, threadId);
      } catch {
        return false;
      }
      if (gen !== genRef.current) return true;
    }
    if (thread.activeRun?.status === "running") return false;
    if (storedReplyIsNew(messagesRef.current, thread.messages)) {
      dispatch({ type: "reconcile", messages: thread.messages });
      cursorFor(center, threadId).clear();
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
    centerIdRef.current = centerId;
    threadIdRef.current = initialThreadId;
  }, [centerId, initialThreadId]);

  useEffect(() => {
    pendingRef.current = state.pendingAction;
    phaseRef.current = state.phase;
    resumingRef.current = state.resuming;
    messagesRef.current = state.messages;
    onTitleRef.current = onTitle;
    onTokensSpentRef.current = onTokensSpent;
    live.current = { pump, settleDrop, failDrop };
  });

  useEffect(() => {
    return () => {
      genRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (activeRun?.status !== "running") return;
    const threadId = initialThreadId;
    const center = centerId;
    const runId = activeRun.runId;
    runIdRef.current = runId;
    const gen = ++genRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "reconnecting" });
    let cancelled = false;
    void (async () => {
      const outcome = await live.current.pump(
        streamCenterAstraRun(
          {
            centerId: center,
            threadId,
            runId,
            lastEventId: cursorFor(center, threadId).lastId(),
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
  }, [activeRun?.runId, activeRun?.status, centerId, initialThreadId]);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pendingRef.current || resumeLock.current || phaseRef.current === "streaming") {
      return;
    }
    const threadId = threadIdRef.current;
    const center = centerIdRef.current;
    cursorFor(center, threadId).clear();
    runIdRef.current = null;
    const { gen, controller } = replaceStream();
    const pendingUserId = crypto.randomUUID();
    dispatch({ type: "send", text: trimmed, pendingUserId });
    void (async () => {
      const outcome = await live.current.pump(
        streamCenterAstraReply(
          { centerId: center, threadId, content: trimmed },
          { signal: controller.signal },
        ),
        gen,
        true,
      );
      if (gen !== genRef.current) return;
      if (outcome === "dropped" || outcome === "finished" || outcome === "running") {
        const ok = await live.current.settleDrop(gen);
        if (!ok && gen === genRef.current) live.current.failDrop();
      }
    })();
  }, []);

  const resolve = useCallback((approved: boolean, args?: Record<string, unknown> | null) => {
    const proposal = pendingRef.current;
    const threadId = threadIdRef.current;
    const center = centerIdRef.current;
    if (!proposal || resumeLock.current || phaseRef.current === "streaming") return;
    cursorFor(center, threadId).clear();
    runIdRef.current = null;
    const { gen, controller } = replaceStream();
    resumeLock.current = true;
    dispatch({ type: "resume" });
    void (async () => {
      try {
        const outcome = await live.current.pump(
          streamCenterAstraAction(
            {
              centerId: center,
              threadId,
              approved,
              actionId: proposal.actionId,
              args: approved ? (args ?? null) : null,
            },
            { signal: controller.signal },
          ),
          gen,
          true,
        );
        if (gen !== genRef.current) return;
        if (outcome === "dropped" || outcome === "finished" || outcome === "running") {
          const ok = await live.current.settleDrop(gen);
          if (!ok && gen === genRef.current) {
            dispatch({
              type: "failed",
              error: {
                code: "UNAVAILABLE",
                message: "Couldn't confirm that draft. You can try again.",
              },
            });
          }
        }
      } finally {
        resumeLock.current = false;
      }
    })();
  }, []);

  const stop = useCallback(() => {
    if (resumingRef.current || resumeLock.current) return;
    genRef.current += 1;
    const threadId = threadIdRef.current;
    const center = centerIdRef.current;
    cursorFor(center, threadId).clear();
    void stopCenterAstraRun({
      centerId: center,
      threadId,
      streamId: runIdRef.current,
    }).catch(() => {});
    runIdRef.current = null;
    abortRef.current?.abort();
    dispatch({ type: "stopped" });
  }, []);

  const retry = useCallback(() => {
    const last = [...messagesRef.current].reverse().find((message) => message.role === "user");
    if (!last || pendingRef.current || resumeLock.current) return;
    send(last.text);
  }, [send]);

  return { state, send, resolve, stop, retry };
}
