import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type {
  ClassroomSubjectsOut,
  SubjectCurriculumOut,
  SubjectPageOut,
} from "@/lib/api/types";
import { TRACK_CATEGORIES, relevantTrackCategories } from "./subjects";
import type {
  GraphNodeState,
  GraphViewEdge,
  GraphViewNode,
} from "@/components/path/graph-view";
import type {
  BrowserTopic,
  ClassGroup,
} from "@/components/classroom/class-term-browser";
import { resolveClassLevel } from "./classroom";
import { CLASS_LEVELS, TERMS, type ClassLevel, type Term } from "./curriculum-scope";

export type ClassroomSubject = {
  code: string;
  name: string;
  slug: string;
  trackCategory: string;
  isWaec: boolean;
  isJamb: boolean;
  isNeco: boolean;
  topicCount: number;
  questionCount: number;
};

export type ClassroomListData = {
  /** Subjects grouped by track category, in TRACK_CATEGORIES order. */
  byCategory: Record<string, ClassroomSubject[]>;
  /**
   * Whether the student's track actually narrows the catalogue. When it does
   * not, the "show all" toggle has nothing to reveal and is hidden.
   */
  hasNarrowing: boolean;
};

/** A tolerant reader for a single JSON value that may be missing or wrong-shaped. */
function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/** A tolerant reader for a numeric JSON value; `null` when absent/garbage. */
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const NODE_STATES: readonly string[] = ["LOCKED", "READY", "STARTED", "DECAYED", "MASTERED"];

function asNodeState(value: unknown): GraphNodeState {
  const state = str(value).toUpperCase();
  return (NODE_STATES as readonly GraphNodeState[]).includes(state as GraphNodeState)
    ? (state as GraphNodeState)
    : "LOCKED";
}

/**
 * backend-ported: the subjects payload rows carry { id, name, slug, topicCount,
 * mastered, started } only — `code`, the exam flags, `description`,
 * `questionCount` and per-topic `curriculumLevel` are not in the contract yet,
 * so they default here and the UI simply hides what it cannot show.
 */
function shortCode(name: string): string {
  return name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}

export async function getClassroomSubjects(
  track: string | null,
  _showAll: boolean,
): Promise<ClassroomListData> {
  void _showAll;
  const relevant = relevantTrackCategories(track);
  const hasNarrowing = relevant.length < TRACK_CATEGORIES.length;

  // The backend already narrows the catalogue server-side to CORE + the
  // student's own track, so `showAll` is intentionally not forwarded.
  const data = await api<ClassroomSubjectsOut>(endpoints.classroom.subjects);

  const byCategory: Record<string, ClassroomSubject[]> = {};
  for (const raw of data.subjects ?? []) {
    const row = raw as Record<string, unknown>;
    const name = str(row.name);
    const subject: ClassroomSubject = {
      // backend-ported: no `code` in the payload — derive a short code from the
      // subject name so the avatar badge has something to render.
      code: str(row.code) || shortCode(name),
      name,
      slug: str(row.slug) || str(row.id),
      trackCategory: str(row.trackCategory) || "CORE",
      isWaec: Boolean(row.isWaec),
      isJamb: Boolean(row.isJamb),
      isNeco: Boolean(row.isNeco),
      topicCount: num(row.topicCount) ?? 0,
      questionCount: num(row.questionCount) ?? 0,
    };
    (byCategory[subject.trackCategory] ??= []).push(subject);
  }

  return { byCategory, hasNarrowing };
}

export type SubjectPageData = {
  subject: {
    id: string;
    code: string;
    name: string;
    slug: string;
    description: string;
    questionCount: number;
    topicCount: number;
  };
  /** WAEC / JAMB / NECO, in that order, for whichever the subject is sat under. */
  examLabels: string[];
  hasTopics: boolean;
  graphNodes: GraphViewNode[];
  graphEdges: GraphViewEdge[];
  masteredCount: number;
  readyCount: number;
  dueCount: number;
  classes: ClassGroup[];
  initialClassLevel: ClassLevel;
};

/**
 * The subject page: the curriculum browser plus the Learning Path graph view
 * (spec Stage 0). Node state is read from the backend's `colour` token, which
 * already encodes the unlock/mastery/revision signal.
 *
 * Returns null when the subject slug does not resolve.
 */
export async function getSubjectPageData(
  _userId: string,
  subjectSlug: string,
  userClassLevel: string | null,
): Promise<SubjectPageData | null> {
  const [subjectResult, curriculumResult] = await Promise.allSettled([
    api<SubjectPageOut>(endpoints.classroom.subject(subjectSlug)),
    api<SubjectCurriculumOut>(endpoints.classroom.curriculum(subjectSlug)),
  ]);
  if (subjectResult.status === "rejected") {
    const error = subjectResult.reason;
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
  const data = subjectResult.value;
  // A failed curriculum read only costs the class/term split, never the page.
  const scopeById =
    curriculumResult.status === "fulfilled"
      ? scopeIndex(curriculumResult.value)
      : new Map<string, TopicScope>();

  const subjectRow = (data.subject ?? {}) as Record<string, unknown>;
  const topicRows = Array.isArray(data.topics) ? (data.topics as Record<string, unknown>[]) : [];
  const subjectName = str(subjectRow.name);
  const topicCount = num(subjectRow.topicCount) ?? topicRows.length;

  const graphNodes: GraphViewNode[] = [];
  const nodeStates: Record<string, GraphNodeState> = {};
  let masteredCount = 0;
  let readyCount = 0;
  let dueCount = 0;
  for (const row of topicRows) {
    const topicId = str(row.id);
    if (!topicId) continue;
    const state = asNodeState(row.colour);
    nodeStates[topicId] = state;
    if (state === "MASTERED") masteredCount += 1;
    if (state === "READY") readyCount += 1;
    if (state === "DECAYED") dueCount += 1;
    graphNodes.push({
      id: topicId,
      title: str(row.title),
      slug: str(row.slug) || topicId,
      orderIndex: num(row.orderIndex) ?? 0,
      state,
      mastery: num(row.mastery) ?? 0,
      confidence: num(row.confidence) ?? 0,
      accObservations: num(row.accObservations) ?? 0,
      lessonObservations: num(row.lessonObservations) ?? 0,
      srsObservations: num(row.srsObservations) ?? 0,
      lastStudy: row.lastStudy !== null && row.lastStudy !== undefined ? str(row.lastStudy) : null,
      // backend-ported: the payload offers no "recommended next" topic, so no
      // node is ever flagged as the next one.
      isNext: false,
    });
  }

  // backend-ported: the subject payload carries no graph edges, so the path
  // renders as an ordered spine with navigation arrows only.
  const graphEdges: GraphViewEdge[] = [];

  const classes = buildClasses(topicRows, nodeStates, userClassLevel, scopeById);

  const classesWithTopics = classes
    .filter((group) => group.terms.some((t) => t.topics.length > 0))
    .map((group) => group.classLevel);

  const examLabels: string[] = [];
  if (subjectRow.isWaec) examLabels.push("WAEC");
  if (subjectRow.isJamb) examLabels.push("JAMB");
  if (subjectRow.isNeco) examLabels.push("NECO");
  // backend-ported: no exam flags in the payload — default to the WAEC frame
  // every NAS subject is sat under.
  if (examLabels.length === 0) examLabels.push("WAEC");

  return {
    subject: {
      id: str(subjectRow.id),
      code: str(subjectRow.code) || shortCode(subjectName),
      name: subjectName,
      slug: str(subjectRow.slug) || subjectSlug,
      description: str(subjectRow.description),
      questionCount: num(subjectRow.questionCount) ?? 0,
      topicCount,
    },
    examLabels,
    hasTopics: topicRows.length > 0,
    graphNodes,
    graphEdges,
    masteredCount,
    readyCount,
    dueCount,
    classes,
    initialClassLevel: resolveClassLevel(userClassLevel, classesWithTopics),
  };
}

type TopicScope = { classLevel: string; term: string };

function isScope(classLevel: string, term: string): boolean {
  return (
    (CLASS_LEVELS as readonly string[]).includes(classLevel) &&
    (TERMS as readonly string[]).includes(term)
  );
}

/** topicId → class/term, from the curriculum route's `levels` buckets. */
function scopeIndex(curriculum: SubjectCurriculumOut): Map<string, TopicScope> {
  const index = new Map<string, TopicScope>();
  for (const level of curriculum.levels ?? []) {
    const classLevel = str(level.classLevel).toUpperCase();
    const term = str(level.term).toUpperCase();
    if (!isScope(classLevel, term)) continue;
    for (const topic of level.topics ?? []) {
      const id = str(topic.id);
      if (id) index.set(id, { classLevel, term });
    }
  }
  return index;
}

/**
 * Per-topic curriculum scope: from the topic row when the subject payload
 * carries it, otherwise from the curriculum index.
 */
function scopeOf(
  row: Record<string, unknown>,
  scopeById: Map<string, TopicScope>,
): TopicScope | null {
  const nested = (row.curriculumLevel ?? row) as Record<string, unknown>;
  const classLevel = str(nested.classLevel ?? nested.class_level);
  const term = str(nested.term);
  if (isScope(classLevel, term)) return { classLevel, term };
  return scopeById.get(str(row.id)) ?? null;
}

function asBrowserTopic(
  row: Record<string, unknown>,
  states: Record<string, GraphNodeState>,
): BrowserTopic {
  const id = str(row.id);
  const state = states[id] ?? "LOCKED";
  return {
    slug: str(row.slug) || id,
    title: str(row.title),
    // backend-ported: topics carry no `completed` flag, so completion is
    // inferred from the node colour the backend already derives.
    completed: state === "MASTERED" || state === "DECAYED",
  };
}

function buildClasses(
  topicRows: Record<string, unknown>[],
  states: Record<string, GraphNodeState>,
  userClassLevel: string | null,
  scopeById: Map<string, TopicScope>,
): ClassGroup[] {
  const scoped = topicRows
    .map((row) => ({ row, scope: scopeOf(row, scopeById) }))
    .filter((entry) => entry.scope !== null);

  if (scoped.length === 0) {
    // backend-ported: no curriculum levels in the payload, so the browser
    // collapses to a single class bucket for the student's own class.
    const classLevel: ClassLevel = (CLASS_LEVELS as readonly string[]).includes(
      str(userClassLevel),
    )
      ? (userClassLevel as ClassLevel)
      : "SS1";
    return [
      {
        classLevel,
        terms: [
          {
            term: "FIRST" as Term,
            topics: topicRows.map((row) => asBrowserTopic(row, states)),
          },
        ],
      },
    ];
  }

  const grouped: Record<string, Record<string, BrowserTopic[]>> = {};
  for (const level of CLASS_LEVELS) grouped[level] = { FIRST: [], SECOND: [], THIRD: [] };
  for (const { row, scope } of scoped) {
    const bucket = grouped[(scope as { classLevel: string }).classLevel]?.[
      (scope as { term: string }).term
    ];
    if (!bucket) continue;
    bucket.push(asBrowserTopic(row, states));
  }

  return CLASS_LEVELS.map((level) => ({
    classLevel: level,
    terms: TERMS.map((term) => ({
      term,
      topics: grouped[level][term],
    })),
  }));
}