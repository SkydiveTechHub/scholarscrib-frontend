import { api } from "@/lib/api/server";
import { isApiError } from "@/lib/api/errors";
import type { PracticeResultOut, TopicPageOut } from "@/lib/api/types";
import {
  deriveObjectives,
  masteryLevelFromScore,
  parseBlocks,
  parseCheckpointState,
  parsePrerequisiteLabels,
  type CheckBlock,
  type LessonBlock,
} from "./lesson-engine";
import type { PrereqStatus } from "@/engines/learning/availability";
import type { TopicState } from "@/engines/learning/mastery";
import type { TopicNavItem } from "./classroom";
import { CLASS_LEVELS, TERMS, type ClassLevel, type Term } from "./curriculum-scope";

/** Matches the `ResourceItem` shape `TopicResources` renders. */
export type TopicResourceItem = {
  id: string;
  title: string;
  url: string;
  resourceType: string;
  description: string | null;
};

export type TopicPageData = {
  subject: { id: string; name: string; code: string };
  topic: {
    id: string;
    title: string;
    estimatedMinutes: number;
    waecWeight: number;
    jambWeight: number;
    questionCount: number;
    classLevel: ClassLevel;
    term: Term;
  };
  /**
   * Every topic maps to exactly one lesson in the source of truth, but this is
   * modelled defensively — a topic somehow missing one renders the page without
   * notes or the action bar rather than crashing.
   */
  lesson: {
    id: string;
    blocks: LessonBlock[];
    fallbackContent: string | null;
  } | null;
  deckId: string | null;
  pretestCertified: boolean;
  topicReady: boolean;
  prereqs: PrereqStatus[];
  topicState: TopicState | null;
  previous: TopicNavItem | null;
  next: TopicNavItem | null;
  lessonResources: TopicResourceItem[];
  subjectResources: TopicResourceItem[];
};

/** A tolerant reader for a single JSON value that may be missing or wrong-shaped. */
function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/** A tolerant reader for a numeric JSON value; `null` when absent/garbage. */
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const MASTERY_LEVELS: readonly string[] = ["STRONG", "COMPETENT", "DEVELOPING", "WEAK"];

function shortCode(name: string): string {
  return name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}

function asClassLevel(row: Record<string, unknown>, fallback: ClassLevel): ClassLevel {
  const value = str(row.classLevel ?? row.class_level);
  return (CLASS_LEVELS as readonly string[]).includes(value)
    ? (value as ClassLevel)
    : fallback;
}

function asTerm(row: Record<string, unknown>, fallback: Term): Term {
  const value = str(row.term);
  return (TERMS as readonly string[]).includes(value) ? (value as Term) : fallback;
}

function asMasteryLevel(value: unknown, fallbackScore: number): TopicState["level"] {
  const level = str(value).toUpperCase();
  return (MASTERY_LEVELS as readonly string[]).includes(level)
    ? (level as TopicState["level"])
    : masteryLevelFromScore(fallbackScore);
}

/**
 * Any topic view endpoint. `view` is "" (overview), "study", "quiz" or
 * "practice"; a 404 (unknown subject/topic) collapses to `null`.
 */
async function fetchTopicPage(
  subjectSlug: string,
  topicSlug: string,
  view: "" | "study" | "quiz" | "practice" = "",
): Promise<TopicPageOut | null> {
  const suffix = view ? `/${view}` : "";
  try {
    return await api<TopicPageOut>(
      `/api/classroom/subjects/${encodeURIComponent(subjectSlug)}/topics/${encodeURIComponent(topicSlug)}${suffix}`,
    );
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

/** Optional TopicPageOut extras the port keeps tolerant about. */
type TopicPageExtras = {
  deckId?: unknown;
  previous?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  level?: unknown;
  retention?: unknown;
  stability?: unknown;
  confidence?: unknown;
  acc?: unknown;
  lessonM?: unknown;
  srs?: unknown;
  lastStudy?: unknown;
  accObservations?: unknown;
  lessonObservations?: unknown;
  srsObservations?: unknown;
};

/**
 * Everything the topic detail page renders, or `null` when the subject or topic
 * does not exist — the caller decides what a miss means (the page 404s).
 */
export async function getTopicPageData(
  userId: string,
  subjectSlug: string,
  topicSlug: string,
): Promise<TopicPageData | null> {
  const payload = await fetchTopicPage(subjectSlug, topicSlug);
  if (!payload) return null;
  return mapTopicPageData(payload);
}

function mapTopicPageData(payload: TopicPageOut): TopicPageData {
  const subjectRow = (payload.subject ?? {}) as Record<string, unknown>;
  const topicRow = (payload.topic ?? {}) as Record<string, unknown>;
  const extras = payload as TopicPageExtras;
  const subjectName = str(subjectRow.name);
  const subjectCode = str(subjectRow.code) || shortCode(subjectName);
  const topicTitle = str(topicRow.title);
  const topicId = str(topicRow.id) || str(topicRow.slug) || topicTitle;

  const lessonRow =
    payload.lesson && typeof payload.lesson === "object"
      ? (payload.lesson as Record<string, unknown>)
      : null;
  const canonicalLessonId = payload.canonicalLessonId ? str(payload.canonicalLessonId) : null;

  const lesson =
    lessonRow !== null
      ? {
          id: str(lessonRow.id) || canonicalLessonId || topicId,
          blocks: parseBlocks(lessonRow.blocks),
          fallbackContent: typeof lessonRow.content === "string" ? lessonRow.content : null,
        }
      : canonicalLessonId
        ? { id: canonicalLessonId, blocks: [], fallbackContent: null }
        : null;

  // backend-ported: the overview carries the topic's curriculum level only when
  // the payload's `curriculumLevel` object is present; it falls back to the
  // student's presumed SS1/FIRST scope.
  const scopeRow =
    topicRow.curriculumLevel && typeof topicRow.curriculumLevel === "object"
      ? (topicRow.curriculumLevel as Record<string, unknown>)
      : topicRow;

  const mastery = num(payload.mastery);

  return {
    subject: {
      id: str(subjectRow.id),
      name: subjectName,
      code: subjectCode,
    },
    topic: {
      id: topicId,
      title: topicTitle,
      // backend-ported: estimatedMinutes lives on the nested lesson, so it is
      // read from there and defaults to 0 when absent.
      estimatedMinutes: num(lessonRow?.estimatedMinutes) ?? 0,
      waecWeight: num(topicRow.waecWeight) ?? 0,
      jambWeight: num(topicRow.jambWeight) ?? 0,
      questionCount: num(payload.questionCount) ?? 0,
      classLevel: asClassLevel(scopeRow, "SS1"),
      term: asTerm(scopeRow, "FIRST"),
    },
    lesson,
    deckId: extras.deckId ? str(extras.deckId) : null,
    pretestCertified: Boolean(payload.alreadyPassed),
    topicReady: Boolean(payload.available),
    // backend-ported: the payload has no per-prereq breakdown, only an
    // `available` flag — the page renders no prerequisite chips.
    prereqs: [],
    topicState: mastery !== null ? topicStateFor(topicId, mastery, extras) : null,
    // backend-ported: no neighbour links in the payload yet.
    previous: extras.previous ? mapNavItem(extras.previous) : null,
    next: extras.next ? mapNavItem(extras.next) : null,
    // backend-ported: the overview response carries no resource rows; the
    // panels render their empty states.
    lessonResources: [],
    subjectResources: [],
  };
}

function topicStateFor(
  topicId: string,
  mastery: number,
  extras: TopicPageExtras,
): TopicState {
  return {
    topicId,
    mastery,
    level: asMasteryLevel(extras.level, mastery),
    // backend-ported: the payload exposes no retention/stability/confidence —
    // they default to their untouched values, which the UI already tolerates.
    retention: num(extras.retention),
    stability: num(extras.stability) ?? 0,
    confidence: num(extras.confidence) ?? 0,
    acc: num(extras.acc),
    lessonM: num(extras.lessonM),
    srs: num(extras.srs),
    lastStudy: extras.lastStudy ? new Date(str(extras.lastStudy)) : null,
    accObservations: num(extras.accObservations) ?? 0,
    lessonObservations: num(extras.lessonObservations) ?? 0,
    srsObservations: num(extras.srsObservations) ?? 0,
  };
}

function mapNavItem(row: Record<string, unknown>): TopicNavItem {
  return {
    slug: str(row.slug),
    title: str(row.title),
    classLevel: str(row.classLevel) || "SS1",
    term: str(row.term) || "FIRST",
    orderIndex: num(row.orderIndex) ?? 0,
  };
}

export type TopicQuizData = {
  /** Authored knowledge checks from the lesson note; empty means fall back. */
  checks: CheckBlock[];
  lessonTitle: string;
};

/**
 * The quick quiz serves the lesson note's own questions when it has any, and
 * the caller falls back to the WAEC/JAMB bank when `checks` is empty.
 */
export async function getTopicQuizData(
  subjectSlug: string,
  topicSlug: string,
): Promise<TopicQuizData | null> {
  const payload = await fetchTopicPage(subjectSlug, topicSlug, "quiz");
  if (!payload) return null;

  const lessonRow =
    payload.lesson && typeof payload.lesson === "object"
      ? (payload.lesson as Record<string, unknown>)
      : null;

  return {
    checks: lessonRow
      ? parseBlocks(lessonRow.blocks).filter((block): block is CheckBlock => block.type === "check")
      : [],
    lessonTitle: str(lessonRow?.title) || str(payload.topic?.title),
  };
}

export type TopicPracticeData = {
  lessonTitle: string;
  topicTitle: string;
  passMarkPercent: number;
  practiceCount: number;
};

/**
 * Practice is deliberately NOT gated on having studied the lesson. The backend
 * always resolves a lesson under a topic's practice view, so every topic that
 * exists is practice-able.
 */
export async function getTopicPracticeData(
  subjectSlug: string,
  topicSlug: string,
): Promise<TopicPracticeData | null | "no-lesson"> {
  const payload = await fetchTopicPage(subjectSlug, topicSlug, "practice");
  if (!payload) return null;

  const lessonRow =
    payload.lesson && typeof payload.lesson === "object"
      ? (payload.lesson as Record<string, unknown>)
      : null;

  return {
    lessonTitle: str(lessonRow?.title) || str(payload.topic?.title),
    topicTitle: str(payload.topic?.title),
    // backend-ported: pass mark/count live on the lesson and default to the
    // values the UI has always used when the payload omits them.
    passMarkPercent: num(lessonRow?.passMarkPercent) ?? 60,
    practiceCount: num(lessonRow?.practiceCount) ?? 10,
  };
}

export type TopicStudyData = {
  subjectName: string;
  topicTitle: string;
  lessonId: string;
  lessonTitle: string;
  blocks: LessonBlock[];
  objectives: string[];
  estimatedMinutes: number;
  difficulty: string;
  prerequisiteLabels: string[];
  locked: boolean;
  lockedReason: string | null;
  passMarkPercent: number;
  practiceCount: number;
  /** Where they left off last time, so re-opening resumes instead of restarting. */
  checkpoint: {
    visited: string[];
    checks: Record<string, { attempts: number; correct: boolean }>;
  };
  legacy: { content: string; keyPoints: string[]; summary: string | null };
};

export async function getTopicStudyData(
  userId: string,
  subjectSlug: string,
  topicSlug: string,
): Promise<TopicStudyData | null | "no-lesson"> {
  const payload = await fetchTopicPage(subjectSlug, topicSlug, "study");
  if (!payload) return null;

  const lessonRow =
    payload.lesson && typeof payload.lesson === "object"
      ? (payload.lesson as Record<string, unknown>)
      : null;
  if (!lessonRow) return "no-lesson";

  const subjectName = str(payload.subject?.name);
  const topicTitle = str(payload.topic?.title);
  const blocks = parseBlocks(lessonRow.blocks);
  const checkpoint = parseCheckpointState(lessonRow.checkpoint);

  // The backend decides unlock for the student's own account, so `locked`
  // mirrors its `unlocked`/`available` signal rather than recomputing gates.
  const unlocked =
    typeof lessonRow.unlocked === "boolean"
      ? lessonRow.unlocked
      : Boolean(payload.available ?? true);
  const locked = !unlocked;

  return {
    subjectName,
    topicTitle,
    lessonId: str(lessonRow.id) || str(payload.canonicalLessonId) || topicTitle,
    lessonTitle: str(lessonRow.title) || topicTitle,
    blocks,
    objectives: deriveObjectives(topicTitle, subjectName),
    // backend-ported: the study payload omits lesson-level fields, so they
    // default to the values the player has always assumed.
    estimatedMinutes: num(lessonRow.estimatedMinutes) ?? 0,
    difficulty: str(lessonRow.difficulty) || "INTERMEDIATE",
    prerequisiteLabels: parsePrerequisiteLabels(lessonRow.prerequisites),
    locked,
    lockedReason: locked
      ? `"${topicTitle}" is still locked. Complete its prerequisites, then return to unlock this lesson.`
      : null,
    passMarkPercent: num(lessonRow.passMarkPercent) ?? 60,
    practiceCount: num(lessonRow.practiceCount) ?? 0,
    checkpoint: { visited: checkpoint.visited, checks: checkpoint.checks },
    legacy: {
      // backend-ported: the study payload's content falls back to plain string
      // form for the legacy viewer when it has no structured blocks.
      content: typeof lessonRow.content === "string" ? lessonRow.content : "",
      keyPoints: Array.isArray(lessonRow.keyPoints)
        ? (lessonRow.keyPoints as unknown[]).map(str).filter(Boolean)
        : [],
      summary: lessonRow.summary !== null && lessonRow.summary !== undefined ? str(lessonRow.summary) : null,
    },
  };
}

export type PracticeMissedQuestion = {
  id: string;
  questionText: string;
  options: Record<string, string> | null;
  correctAnswer: string;
  explanation: string | null;
};

export type TopicPracticeResult = {
  topicTitle: string;
  passMarkPercent: number;
  percentage: number;
  passed: boolean;
  bestMastery: number;
  masteryLevel: string;
  score: number | null;
  totalMarks: number | null;
  completedAt: string | null;
  nextRevisionAt: string;
  missed: PracticeMissedQuestion[];
};

export type TopicPracticeResultOutcome =
  | { status: "not-found" }
  | { status: "no-lesson" }
  | { status: "no-attempt" }
  | { status: "ok"; result: TopicPracticeResult };

/** The latest completed practice attempt for the topic (the backend resolves it client-side). */
export async function getTopicPracticeResult(
  userId: string,
  subjectSlug: string,
  topicSlug: string,
  _attemptId: string,
): Promise<TopicPracticeResultOutcome> {
  void _attemptId;
  let payload: PracticeResultOut;
  try {
    payload = await api<PracticeResultOut>(
      `/api/classroom/subjects/${encodeURIComponent(subjectSlug)}/topics/${encodeURIComponent(topicSlug)}/practice/result`,
    );
  } catch (error) {
    if (isApiError(error) && error.status === 404) return { status: "not-found" };
    throw error;
  }

  const raw = payload.result;
  if (!raw || typeof raw !== "object") return { status: "no-attempt" };
  const result = raw as Record<string, unknown>;

  const percentage = num(result.percentage) ?? 0;
  const passMarkPercent = num(result.passMarkPercent) ?? 60;
  const passed = Boolean(result.passed) || percentage >= passMarkPercent;
  const bestMastery = num(result.bestMastery) ?? Math.round(percentage);
  const completedAt = result.completedAt ? str(result.completedAt) : null;

  return {
    status: "ok",
    result: {
      topicTitle: str(result.topicTitle) || titleFromSlug(topicSlug),
      passMarkPercent,
      percentage,
      passed,
      bestMastery,
      masteryLevel: asMasteryLevel(result.masteryLevel, bestMastery),
      score: num(result.score) ?? 0,
      totalMarks: num(result.totalMarks) ?? 0,
      completedAt,
      // backend-ported: the result omits a revision due date, so it defaults to
      // one day after the attempt — the interval the old scheduler used first.
      nextRevisionAt: result.nextRevisionAt
        ? str(result.nextRevisionAt)
        : defaultRevision(completedAt),
      missed: Array.isArray(result.missed) ? result.missed.map(asMissedQuestion) : [],
    },
  };
}

function defaultRevision(completedAt: string | null): string {
  const base = completedAt ? new Date(completedAt).getTime() : Number.NaN;
  const at = Number.isFinite(base) ? base + 86_400_000 : Date.now();
  return new Date(at).toISOString();
}

function titleFromSlug(slug: unknown): string {
  const words = str(slug)
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return words || "This topic";
}

function asMissedQuestion(raw: unknown): PracticeMissedQuestion {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    id: str(row.id ?? row.questionId),
    questionText: str(row.questionText ?? row.question),
    options:
      row.options && typeof row.options === "object" && !Array.isArray(row.options)
        ? Object.fromEntries(
            Object.entries(row.options as Record<string, unknown>).map(([key, value]) => [
              key,
              str(value),
            ]),
          )
        : null,
    correctAnswer: str(row.correctAnswer ?? row.answer),
    explanation:
      row.explanation !== null && row.explanation !== undefined
        ? str(row.explanation)
        : null,
  };
}