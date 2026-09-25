import { api } from "@/lib/api/server";
import { isApiError } from "@/lib/api/errors";
import type {
  DecksOut,
  FlashcardStatsOut,
  RecommendationsOut,
} from "@/lib/api/types";
import type {
  DeckSummary,
  FlashcardRecommendation,
  FlashcardStats,
  StudyCardState,
} from "@/types/flashcards";

/**
 * Page-level flashcard services.
 *
 * The hub, study and stats pages read through these loaders, which call the
 * backend's flashcard endpoints (`GET /api/flashcards`,
 * `/recommendations`, `/stats`, `/decks/{deckId}`) with the request's token
 * cookie. The REST routes cover list, create, review and enroll on the client;
 * the SRS engine lives in `spaced-repetition.ts` and is untouched here.
 */

export type FlashcardsPageData = {
  decks: DeckSummary[];
  recommendations: FlashcardRecommendation[];
  totalDue: number;
  totalFresh: number;
  /** Deck with the most cards due — the "start studying" target. */
  bestDeckId: string | null;
  decksWithDue: number;
  /** Lessons the student has taken, newest first, that can become a deck. */
  lessons: {
    lessonId: string;
    title: string;
    subjectName: string;
    topicTitle: string;
    /** They reached the end of it — finished lessons are offered first. */
    completed: boolean;
    /** How far through they are, 0..100. */
    completionPercent: number;
    /** The deck already built from this lesson, if there is one. */
    deck: { id: string; cardCount: number } | null;
  }[];
};

/** A number off a wire payload, or null when it is absent or not finite. */
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A string or null off a wire payload. */
function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asDeckSummary(row: Record<string, unknown>): DeckSummary {
  const source =
    row.source === "LESSON" || row.source === "AI" ? row.source : "AUTHORED";
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    description: str(row.description),
    source,
    subjectName: str(row.subjectName),
    topicTitle: str(row.topicTitle),
    totalCards: num(row.totalCards) ?? 0,
    due: num(row.due) ?? 0,
    fresh: num(row.fresh) ?? 0,
    reviewed: num(row.reviewed) ?? 0,
    enrolled: row.enrolled === true,
    lastReviewedAt: str(row.lastReviewedAt),
  };
}

function asRecommendation(
  row: Record<string, unknown>,
): FlashcardRecommendation {
  const priority =
    row.priority === "high" || row.priority === "medium"
      ? row.priority
      : "low";
  return {
    id: String(row.id ?? ""),
    priority,
    title: String(row.title ?? ""),
    rationale: String(row.rationale ?? ""),
    href: str(row.href) ?? undefined,
    deckId: str(row.deckId) ?? undefined,
  };
}

function asPickerLesson(
  row: unknown,
): FlashcardsPageData["lessons"][number] | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const lessonId = str(r.lessonId) ?? str(r.id);
  if (!lessonId) return null;
  const deck =
    r.deck && typeof r.deck === "object"
      ? (r.deck as Record<string, unknown>)
      : null;
  const deckId = deck ? str(deck.id) : null;
  return {
    lessonId,
    title: String(r.title ?? ""),
    subjectName: String(r.subjectName ?? ""),
    topicTitle: String(r.topicTitle ?? ""),
    completed: r.completed === true,
    completionPercent: num(r.completionPercent) ?? 0,
    deck: deckId
      ? { id: deckId, cardCount: num(deck?.cardCount) ?? 0 }
      : null,
  };
}

/**
 * `GET /api/flashcards` answers with deck summaries. The lesson picker list
 * rides along when the backend sends it; without it the picker shows its
 * empty state rather than the page failing.
 */
type FlashcardsIndexOut = DecksOut & {
  recommendations?: unknown;
  lessons?: unknown;
};

export async function getFlashcardsPageData(
  _userId: string,
): Promise<FlashcardsPageData> {
  const [index, recs] = await Promise.all([
    api<FlashcardsIndexOut>("/api/flashcards"),
    api<RecommendationsOut>("/api/flashcards/recommendations"),
  ]);

  const decks = (Array.isArray(index.decks) ? index.decks : []).map(
    asDeckSummary,
  );
  const recRows = Array.isArray(recs.recommendations)
    ? recs.recommendations
    : Array.isArray(index.recommendations)
      ? index.recommendations
      : [];
  const recommendations = recRows
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map(asRecommendation);
  const lessons = Array.isArray(index.lessons)
    ? index.lessons
        .map(asPickerLesson)
        .filter((lesson): lesson is FlashcardsPageData["lessons"][number] => lesson !== null)
    : [];

  const bestDeck =
    decks.length > 0 ? decks.reduce((a, b) => (b.due > a.due ? b : a)) : null;

  return {
    decks,
    recommendations,
    totalDue: decks.reduce((sum, d) => sum + d.due, 0),
    totalFresh: decks.reduce((sum, d) => sum + d.fresh, 0),
    bestDeckId: bestDeck?.id ?? null,
    decksWithDue: decks.filter((d) => d.due > 0).length,
    lessons,
  };
}

export type DeckPageData = {
  deck: {
    id: string;
    title: string;
    description: string | null;
    subjectName: string | null;
    topicTitle: string | null;
    /** This student created it, so they may delete it. */
    isOwner: boolean;
    /** Other students following this deck — zero for a private one. */
    followerCount: number;
    /** The lesson it was built from, so a deleted deck can be rebuilt. */
    lessonId: string | null;
  };
  queue: StudyCardState[];
};

/** The deck page payload: deck fields plus the pre-built study queue. */
type DeckPageOut = {
  deck?: Record<string, unknown> | null;
  queue?: unknown;
  dueCount?: number;
  newCount?: number;
};

function asStudyCard(row: Record<string, unknown>): StudyCardState {
  const raw =
    row.review && typeof row.review === "object"
      ? (row.review as Record<string, unknown>)
      : null;
  const review = raw
    ? {
        state: String(raw.state ?? "REVIEW"),
        intervalDays: num(raw.intervalDays) ?? 0,
        retention: num(raw.retention) ?? 1,
        difficulty: num(raw.difficulty) ?? 5,
        dueAt: String(raw.dueAt ?? ""),
        lastReviewedAt: str(raw.lastReviewedAt),
      }
    : null;
  return {
    cardId: String(row.cardId ?? ""),
    cardType: (row.cardType as StudyCardState["cardType"]) ?? "DEFINITION",
    prompt: str(row.prompt),
    payload: row.payload,
    authoredDifficulty: String(row.authoredDifficulty ?? 5),
    review,
  };
}

/** A deck and its due queue, or null when it does not exist. */
export async function getDeckPageData(
  userId: string,
  deckId: string,
): Promise<DeckPageData | null> {
  let payload: DeckPageOut;
  try {
    payload = await api<DeckPageOut>(`/api/flashcards/decks/${deckId}`);
  } catch (error) {
    // The route does not distinguish "missing" from "not yours": both 404.
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }

  const raw = payload.deck ?? {};
  const count = raw._count as { enrollments?: unknown } | undefined;
  return {
    deck: {
      id: String(raw.id ?? deckId),
      title: String(raw.title ?? ""),
      description: str(raw.description),
      subjectName: str(raw.subjectName) ?? str((raw.subject as Record<string, unknown> | null | undefined)?.name),
      topicTitle: str(raw.topicTitle) ?? str((raw.topic as Record<string, unknown> | null | undefined)?.title),
      isOwner: raw.isOwner === true || str(raw.createdBy) === userId,
      followerCount:
        num(raw.followerCount) ??
        num(raw.enrollmentCount) ??
        num(count?.enrollments) ??
        0,
      lessonId: str(raw.lessonId),
    },
    queue: Array.isArray(payload.queue)
      ? payload.queue
          .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
          .map(asStudyCard)
      : [],
  };
}

/** Retention, activity and leech statistics for the stats dashboard. */
export async function getFlashcardStatsFor(
  _userId: string,
): Promise<FlashcardStats> {
  const data = await api<FlashcardStatsOut>("/api/flashcards/stats");
  const raw = (data.stats ?? {}) as Partial<FlashcardStats>;
  return {
    reviewsToday: num(raw.reviewsToday) ?? 0,
    reviewsThisWeek: num(raw.reviewsThisWeek) ?? 0,
    totalReviews: num(raw.totalReviews) ?? 0,
    cardsLearned: num(raw.cardsLearned) ?? 0,
    learnedToday: num(raw.learnedToday) ?? 0,
    measuredRetention: num(raw.measuredRetention),
    predictedRetention: num(raw.predictedRetention),
    avgIntervalDays: num(raw.avgIntervalDays),
    streak: num(raw.streak) ?? 0,
    medianResponseTimeMs: num(raw.medianResponseTimeMs),
    activity: Array.isArray(raw.activity) ? raw.activity : [],
    decks: Array.isArray(raw.decks) ? raw.decks : [],
    difficultyMix: raw.difficultyMix ?? { easy: 0, medium: 0, hard: 0 },
    leechCards: Array.isArray(raw.leechCards) ? raw.leechCards : [],
    totalDue: num(raw.totalDue) ?? 0,
    totalNew: num(raw.totalNew) ?? 0,
  };
}
