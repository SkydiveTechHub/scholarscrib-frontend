"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api/client";
import {
  STORAGE_VERSION,
  buildSubmission,
  clampIndex,
  countAnswered,
  emptyAnswers,
  hasExpired,
  parseStoredSession,
  progressPercent,
  secondsRemaining,
  storageKeyFor,
  withAccumulatedTime,
  withSelectedAnswer,
  withAppendedPage,
  withToggledFlag,
  type AnswerMap,
  type ExamQuestion,
  type SessionData,
  type SubmissionAnswer,
} from "./exam-state";
import { nextAwayCount } from "./exam-focus";

// React glue around `exam-state`. All the rules that decide whether a student
// keeps their work live in that module, where they are unit-tested; this file
// only wires them to state, timers and the network.

export type { AnswerState, ExamQuestion } from "./exam-state";
export { formatExamTime } from "./exam-state";

export type GeneratedExam = {
  attemptId: string;
  title: string;
  questions: ExamQuestion[];
  /** Null for an untimed exam, e.g. the quick quiz. */
  timeLimitMinutes: number | null;
  /** Server-authoritative deadline. Preferred over the local clock when present. */
  deadlineAt?: string;
  /** True when the server handed back an unfinished attempt rather than a new one. */
  resumed?: boolean;
  /** Set when `questions` is only the first page; handed back to `loadMore`. */
  nextCursor?: string | null;
};

/** One further page of a paged paper, as returned by `loadMore`. */
export type ExamPage = {
  questions: ExamQuestion[];
  nextCursor: string | null;
};

/** What we hand back to the caller to drive the UI. */
export type ExamSession = ReturnType<typeof useExamSession>;

function readStored(sessionKey: string) {
  if (typeof window === "undefined") return null;
  try {
    return parseStoredSession(
      window.localStorage.getItem(storageKeyFor(sessionKey)),
      Date.now(),
    );
  } catch {
    return null;
  }
}

function writeStored(
  sessionKey: string,
  data: SessionData,
  answers: AnswerMap,
  currentIndex: number,
  awayEvents: number,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKeyFor(sessionKey),
      JSON.stringify({
        ...data,
        v: STORAGE_VERSION,
        answers,
        currentIndex,
        awayEvents,
      }),
    );
  } catch {
    // storage disabled / quota — the in-memory session still works
  }
}

function clearStored(sessionKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKeyFor(sessionKey));
  } catch {
    // nothing to clean up
  }
}

export function useExamSession({
  sessionKey,
  generate,
  resultHref,
  defaultTimeLimitMinutes = 60,
  practiceExit,
  submit,
  loadMore,
  secondsPerExtraQuestion = 0,
}: {
  /** Stable per exam configuration. Distinct configs must not share a session. */
  sessionKey: string;
  generate: () => Promise<GeneratedExam>;
  resultHref: (attemptId: string) => string;
  defaultTimeLimitMinutes?: number;
  /**
   * Set by a lesson practice exit. Grading then also records the completion,
   * mastery and revision date the attempt earned, rather than the result page
   * doing it as a side effect of rendering.
   */
  practiceExit?: { subjectSlug: string; topicSlug: string };
  /**
   * Replaces the server submit and the redirect to `resultHref`. For papers
   * drawn straight from the question bank, which have no server attempt to
   * grade; the caller scores the answers and shows the result itself.
   */
  submit?: (answers: SubmissionAnswer[], awayEvents: number) => Promise<void>;
  /**
   * Fetches the page after `cursor`, for papers served a page at a time.
   * Called when the student moves past the last question loaded so far, with
   * the attempt the page belongs to.
   */
  loadMore?: (cursor: string, attemptId: string) => Promise<ExamPage>;
  /** Time added to a timed paper's deadline for each question `loadMore` adds. */
  secondsPerExtraQuestion?: number;
}) {
  const router = useRouter();

  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** Submit failures are recoverable — kept separate so we never unmount the quiz. */
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [focusMode, setFocusMode] = useState(false);
  const [hideTimer, setHideTimer] = useState(false);

  // The ref is the source of truth for answers: `handleSubmit` reads it
  // synchronously right after recording time on the current question, and React
  // has not flushed the matching setState by then. Only ever written from event
  // handlers and effects — never during render.
  const answersRef = useRef<AnswerMap>({});
  const questionStartRef = useRef(0);
  /**
   * The one generation in flight (or already settled) for a session key.
   *
   * React double-invokes effects in development, and refs survive that remount.
   * Holding the promise rather than a "started" flag lets the second run await
   * the same generation the first run kicked off: still exactly one assessment
   * row per key, but the run that outlives the remount is the one that commits.
   */
  const startRef = useRef<{
    key: string;
    promise: Promise<GeneratedExam>;
  } | null>(null);
  const submittedRef = useRef(false);
  /**
   * How many times the student has left, and when the current absence began.
   * Refs, not state: a tab switch must not re-render a 180-question paper, and
   * the count is only ever read at submit time.
   */
  const awayCountRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);

  const questions = useMemo(() => data?.questions ?? [], [data]);
  const attemptId = data?.attemptId ?? "";
  const deadlineAt = data?.deadlineAt ?? null;

  /** O(1) index lookup — the mock exam navigator used indexOf over 180 items per render. */
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((q, i) => map.set(q.id, i));
    return map;
  }, [questions]);

  const persist = useCallback(
    (index: number) => {
      if (!data) return;
      writeStored(sessionKey, data, answersRef.current, index, awayCountRef.current);
    },
    [data, sessionKey],
  );

  // ── Start or resume ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = readStored(sessionKey);
      if (stored) {
        if (cancelled) return;
        answersRef.current = stored.answers;
        awayCountRef.current = stored.awayEvents;
        questionStartRef.current = Date.now();
        setData({
          attemptId: stored.attemptId,
          title: stored.title,
          questions: stored.questions,
          deadlineAt: stored.deadlineAt,
          startedAt: stored.startedAt,
          nextCursor: stored.nextCursor ?? null,
        });
        setAnswers(stored.answers);
        setCurrentIndex(clampIndex(stored.currentIndex, stored.questions.length));
        setResumed(true);
        setLoading(false);
        return;
      }

      try {
        // Started once per key. The assignment lands before the first await,
        // so the remounted run always finds this rather than racing it, and a
        // genuinely new key still generates a paper of its own.
        if (startRef.current?.key !== sessionKey) {
          startRef.current = { key: sessionKey, promise: generate() };
        }
        const exam = await startRef.current.promise;
        if (cancelled) return;
        // Prefer the server's deadline; it is what submission is judged against.
        // No server deadline and no configured time limit means an untimed
        // session such as the quick quiz — leave it without a deadline rather
        // than inventing one from `defaultTimeLimitMinutes`.
        const minutes = exam.timeLimitMinutes || defaultTimeLimitMinutes;
        let deadline: number | null;
        if (exam.deadlineAt) {
          deadline = new Date(exam.deadlineAt).getTime();
        } else if (minutes) {
          deadline = Date.now() + minutes * 60 * 1000;
        } else {
          deadline = null;
        }
        const session: SessionData = {
          attemptId: exam.attemptId,
          title: exam.title,
          questions: exam.questions,
          deadlineAt: deadline,
          startedAt: Date.now(),
          nextCursor: exam.nextCursor ?? null,
        };
        answersRef.current = emptyAnswers(exam.questions);
        awayCountRef.current = 0;
        questionStartRef.current = Date.now();
        writeStored(sessionKey, session, answersRef.current, 0, 0);
        setData(session);
        setAnswers(answersRef.current);
        // The server may have handed back an unfinished attempt — e.g. after
        // switching device, or when local storage was cleared.
        if (exam.resumed) setResumed(true);
        setLoading(false);
      } catch (err) {
        // Dropped before the cancelled check so a retry regenerates rather
        // than re-awaiting the promise that just failed.
        if (startRef.current?.key === sessionKey) startRef.current = null;
        if (cancelled) return;
        // A failed start is unrecoverable in place — surface it as a hard error.
        setError(
          err instanceof Error ? err.message : "Network error. Please try again.",
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionKey, generate, defaultTimeLimitMinutes]);

  // ── Timer ────────────────────────────────────────────────
  // Anchored to an absolute deadline. A decrementing counter drifts and, worse,
  // stalls entirely when a mobile browser throttles the backgrounded tab —
  // handing the student minutes of extra exam time.
  useEffect(() => {
    if (deadlineAt == null) return;
    const tick = () => setTimeRemaining(secondsRemaining(deadlineAt, Date.now()));
    tick();
    const interval = setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadlineAt]);

  // ── Focus tracking ───────────────────────────────────────
  // `visibilitychange` only, never `blur`: blur fires for the devtools, the URL
  // bar and a `<select>` popup, none of which mean the student left. The count
  // is recorded on *return*, so the absence is measured rather than assumed,
  // and anything under `AWAY_FLOOR_MS` is dropped — on a phone that is a
  // screenshot or a notification banner, not cheating.
  useEffect(() => {
    if (!attemptId) return;

    function onVisibilityChange() {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }
      const previous = awayCountRef.current;
      awayCountRef.current = nextAwayCount(
        previous,
        hiddenAtRef.current,
        Date.now(),
      );
      hiddenAtRef.current = null;
      // Written through on the spot rather than waiting for the next answer or
      // navigation: a student who leaves, comes back and immediately refreshes
      // would otherwise resume with the absence forgotten.
      if (awayCountRef.current !== previous) persist(currentIndex);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [attemptId, persist, currentIndex]);

  // ── Mutations ────────────────────────────────────────────
  const recordTimeOnQuestion = useCallback(() => {
    const q = questions[currentIndex];
    if (!q) return;
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    questionStartRef.current = Date.now();
    const next = withAccumulatedTime(answersRef.current, q.id, elapsed);
    if (next === answersRef.current) return;
    answersRef.current = next;
    setAnswers(next);
  }, [questions, currentIndex]);

  // Once Submit is pressed the paper is frozen: nothing changed now could
  // reach the server, so the UI must not pretend otherwise. A failed submit
  // clears submittedRef and unfreezes it for the retry.
  const selectAnswer = useCallback(
    (questionId: string, choice: string) => {
      if (submittedRef.current) return;
      answersRef.current = withSelectedAnswer(answersRef.current, questionId, choice);
      setAnswers(answersRef.current);
      persist(currentIndex);
    },
    [persist, currentIndex],
  );

  const toggleFlag = useCallback(
    (questionId: string) => {
      if (submittedRef.current) return;
      answersRef.current = withToggledFlag(answersRef.current, questionId);
      setAnswers(answersRef.current);
      persist(currentIndex);
    },
    [persist, currentIndex],
  );

  const goToQuestion = useCallback(
    (index: number) => {
      if (submittedRef.current || !questions[index]) return;
      recordTimeOnQuestion();
      setCurrentIndex(index);
      persist(index);
    },
    [questions, recordTimeOnQuestion, persist],
  );

  const nextCursor = loadMore ? (data?.nextCursor ?? null) : null;
  const hasMore = nextCursor !== null;
  const loadingMoreRef = useRef(false);

  /**
   * Moves forward one question, fetching the next page first when the student
   * is on the last question loaded so far. A failed fetch leaves them where
   * they are with `loadMoreError` set, so pressing Next again retries.
   */
  const goNext = useCallback(async () => {
    if (submittedRef.current) return;
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
      return;
    }
    if (!data || !loadMore || nextCursor === null) return;
    if (loadingMoreRef.current || submittedRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const page = await loadMore(nextCursor, data.attemptId);
      if (submittedRef.current) return;
      const grown = withAppendedPage(
        data,
        page.questions,
        page.nextCursor,
        secondsPerExtraQuestion,
      );
      const added = grown.questions.slice(data.questions.length);
      answersRef.current = { ...emptyAnswers(added), ...answersRef.current };
      recordTimeOnQuestion();
      const index = added.length > 0 ? data.questions.length : currentIndex;
      writeStored(sessionKey, grown, answersRef.current, index, awayCountRef.current);
      setData(grown);
      setAnswers(answersRef.current);
      setCurrentIndex(index);
    } catch (err) {
      setLoadMoreError(
        err instanceof Error
          ? err.message
          : "Couldn't load the next questions. Try again.",
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [
    currentIndex,
    questions.length,
    goToQuestion,
    data,
    loadMore,
    nextCursor,
    secondsPerExtraQuestion,
    recordTimeOnQuestion,
    sessionKey,
  ]);

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submittedRef.current || !attemptId) return;
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    recordTimeOnQuestion();

    try {
      const submission = buildSubmission(questions, answersRef.current);
      if (submit) {
        await submit(submission, awayCountRef.current);
        clearStored(sessionKey);
        setShowConfirmSubmit(false);
        return;
      }

      await fetchApi("/api/assessments/submit", {
        method: "POST",
        body: {
          attemptId,
          answers: submission,
          awayEvents: awayCountRef.current,
          ...(practiceExit ? { practiceExit } : {}),
        },
      });

      clearStored(sessionKey);
      // `submitting` stays true from here until the results page replaces
      // this one, so the "marking" overlay covers the navigation too and the
      // student never lands back on an editable paper.
      router.push(resultHref(attemptId));
    } catch (error) {
      // Keep the session mounted and the answers intact so the student can
      // retry. Losing two hours of work to one failed request is not an option.
      submittedRef.current = false;
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Couldn't reach the server. Your answers are saved — try again.",
      );
      setSubmitting(false);
    }
  }, [
    attemptId,
    practiceExit,
    questions,
    recordTimeOnQuestion,
    resultHref,
    router,
    sessionKey,
    submit,
  ]);

  // The results route's loading screen is only instant once prefetched, and
  // the attempt id is known from the start: fetch it now, not at submit time.
  // Keyed on the URL, not the function: callers may pass an inline resultHref.
  const resultPath = attemptId && !submit ? resultHref(attemptId) : null;
  useEffect(() => {
    if (resultPath) router.prefetch(resultPath);
  }, [resultPath, router]);

  // Kept in a ref so the timer can reach the newest closure without restarting.
  const submitRef = useRef(handleSubmit);
  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Auto-submit lives in its own effect rather than inside a setState updater.
  // Updaters must be pure — React invokes them twice under StrictMode, which
  // fired two submissions and read a stale `submitting` guard. `hasExpired`
  // reads the clock rather than `timeRemaining`, which is still 0 from its
  // initial state on the commit where the session first loads.
  useEffect(() => {
    if (submittedRef.current) return;
    if (!hasExpired(deadlineAt, Date.now())) return;
    submitRef.current();
  }, [timeRemaining, deadlineAt]);

  // Warn before an accidental refresh or tab close. Answers are persisted, so
  // this is a courtesy rather than the safety net.
  useEffect(() => {
    if (!attemptId) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (submittedRef.current) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [attemptId]);

  // ── Derived ──────────────────────────────────────────────
  const { answeredCount, flaggedCount } = useMemo(
    () => countAnswered(questions, answers),
    [questions, answers],
  );

  const isAnswered = useCallback(
    (questionId: string) => Boolean(answers[questionId]?.selectedAnswer),
    [answers],
  );

  return {
    // state
    loading,
    error,
    submitError,
    submitting,
    resumed,
    attemptId,
    title: data?.title ?? "",
    questions,
    currentIndex,
    currentQuestion: questions[currentIndex],
    answers,
    timeRemaining,
    deadlineAt,
    showConfirmSubmit,
    focusMode,
    hideTimer,
    hasMore,
    loadingMore,
    loadMoreError,
    // derived
    indexById,
    answeredCount,
    flaggedCount,
    unanswered: Math.max(0, questions.length - answeredCount),
    progressPercent: progressPercent(questions, answers),
    lowTime: timeRemaining > 0 && timeRemaining < 300,
    // actions
    setShowConfirmSubmit,
    setFocusMode,
    setHideTimer,
    selectAnswer,
    toggleFlag,
    goToQuestion,
    goNext,
    handleSubmit,
    isAnswered,
  };
}
