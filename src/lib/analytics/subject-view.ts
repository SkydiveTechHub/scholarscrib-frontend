import { api } from "@/lib/api/server";
import { getGrade } from "@/lib/performance";
import type { PerformanceOut, PerformanceSubject } from "@/lib/api/types";
import type {
  TopicGroups,
  TopicRow,
  TopicGroupKey,
} from "@/engines/analytics/topic-groups";
import type { Profile } from "@/engines/analytics/profile";
import type { Insight } from "@/engines/analytics/insight";

// Assembles the subject lens. The analytics rules used to live in the engines;
// the backend now owns that computation, so this file only maps the
// `/api/performance` payload onto the shapes the page and its components read.
// See docs/superpowers/specs/2026-08-28-performance-analytics-design.md §4.

/**
 * Answers required before this page will state an accuracy figure or a grade.
 *
 * Deliberately the same floor the profile uses to decide whether it will
 * describe *how* a student answers: it would be incoherent to refuse to
 * describe their answering below 20 answers while confidently grading how well
 * they answer off one. A precise-looking figure the evidence cannot support is
 * worse than no figure — so below this we show the raw count instead, which is
 * what tells the student how to resolve the uncertainty.
 */
export const MIN_GRADED_ANSWERS = 20;

export type SubjectChoice = {
  id: string;
  name: string;
  slug: string;
  code: string;
  /**
   * Accuracy across all recorded answers, 0..100, or null below
   * MIN_GRADED_ANSWERS — including with no answers at all.
   */
  accuracy: number | null;
  answered: number;
};

export type SubjectVerdict = {
  accuracy: number | null;
  grade: string | null;
  answered: number;
  correct: number;
  topicsCovered: number;
  topicsInScope: number;
  secondsSpent: number;
};

export type SubjectPerformance = {
  subject: { id: string; name: string; slug: string; code: string };
  verdict: SubjectVerdict;
  groups: TopicGroups;
  profile: Profile;
  insights: Insight[];
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function int(value: unknown): number | null {
  const n = num(value);
  return n === null ? null : Math.floor(n);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Backend accuracy may be a 0..1 fraction or an already-scaled 0..100. */
function normalizeAccuracy(value: number): number {
  return value > 0 && value <= 1 ? value * 100 : value;
}

function accuracyFor(
  raw: number | null,
  answered: number,
  correct: number,
): number | null {
  if (raw !== null) return normalizeAccuracy(raw);
  return answered > 0 ? (correct / answered) * 100 : null;
}

const GROUPS: { key: TopicGroupKey; field: string }[] = [
  { key: "NEEDS_WORK", field: "needsWork" },
  { key: "NEEDS_REVISION", field: "needsRevision" },
  { key: "COMING_ALONG", field: "comingAlong" },
  { key: "UNPROVEN", field: "unproven" },
  { key: "SOLID", field: "solid" },
];

/** Maps a loose topic row onto the TopicRow the group list renders. */
function asTopicRow(value: unknown, group: TopicGroupKey): TopicRow {
  const r = isRecord(value) ? value : {};
  const accObservations = int(r.accObservations) ?? 0;
  const lessonObservations = int(r.lessonObservations) ?? 0;
  const srsObservations = int(r.srsObservations) ?? 0;
  return {
    topicId: str(r.topicId) ?? str(r.id) ?? "",
    subjectId: str(r.subjectId) ?? "",
    title: str(r.title) ?? str(r.topicTitle) ?? "",
    slug: str(r.slug) ?? str(r.topicSlug) ?? "",
    group,
    // backend-ported: the payload does not carry the classifier's category.
    category: null,
    mastery: num(r.mastery) ?? 0,
    retention: num(r.retention),
    confidence: num(r.confidence) ?? 0,
    observations:
      int(r.observations) ??
      accObservations + lessonObservations + srsObservations,
    accObservations,
    lessonObservations,
    srsObservations,
    bottleneckScore: num(r.bottleneckScore) ?? 0,
    lastStudy: typeof r.lastStudy === "string" ? r.lastStudy : null,
    stale: r.stale === true,
  };
}

/** One drill-in group, from the payload's camelCase/UPPER field or groups map. */
function rowsFor(
  subject: Record<string, unknown> | null,
  key: TopicGroupKey,
): TopicRow[] {
  if (!subject) return [];
  const groups = isRecord(subject.groups) ? subject.groups : {};
  const field = GROUPS.find((g) => g.key === key)?.field ?? "";
  const candidates = [
    subject[field],
    groups[field],
    groups[field.toUpperCase()],
    subject[field.toUpperCase()],
  ];
  const raw = candidates.find((candidate) => Array.isArray(candidate)) ?? [];
  return raw.map((row) => asTopicRow(row, key));
}

/**
 * Subjects the student has any evidence in, weakest first — the ordering is
 * itself advice, so the chip they most need is the one nearest the thumb.
 */
export async function getSubjectChoices(userId: string): Promise<SubjectChoice[]> {
  const perf = await api<PerformanceOut>("/api/performance", {
    params: { pageSize: 100 },
  });

  return (perf.subjects ?? [])
    .map((row) => {
      const answered = num(row.totalAttempted) ?? 0;
      return {
        id: str(row.id) ?? str(row.slug) ?? str(row.code) ?? "",
        name: str(row.name) ?? "",
        slug: str(row.slug) ?? str(row.id) ?? "",
        code: str(row.code) ?? "",
        answered,
        // The chips render this figure, so it is gated by the same floor as
        // the verdict — a "PHY 100%" chip off one answer is not a fact.
        accuracy:
          answered >= MIN_GRADED_ANSWERS
            ? accuracyFor(num(row.accuracy), answered, num(row.totalCorrect) ?? 0)
            : null,
      };
    })
    .filter((choice) => choice.answered > 0)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
}

export async function getSubjectPerformance(
  userId: string,
  subjectSlug: string,
  now = new Date(),
): Promise<SubjectPerformance | null> {
  const perf = await api<PerformanceOut>("/api/performance", {
    params: { subject: subjectSlug },
  });

  const matching = (perf.subjects ?? []).find(
    (row) =>
      str(row.slug) === subjectSlug || str(row.id) === subjectSlug,
  );
  const drill = isRecord(perf.subject) ? perf.subject : null;
  if (!drill && !matching) return null;

  const subjectIdentity = {
    id: str(drill?.id) ?? str(matching?.id) ?? "",
    name: str(drill?.name) ?? str(matching?.name) ?? "",
    slug: str(drill?.slug) ?? str(matching?.slug) ?? subjectSlug,
    code: str(drill?.code) ?? str(matching?.code) ?? "",
  };

  const answered = num(matching?.totalAttempted) ?? num(drill?.totalAttempted) ?? 0;
  const correct = num(matching?.totalCorrect) ?? num(drill?.totalCorrect) ?? 0;
  // `answered` and `correct` below stay the real counts even when we withhold
  // the figure: the count is what tells the student how to resolve it.
  const accuracy =
    answered >= MIN_GRADED_ANSWERS
      ? accuracyFor(num(matching?.accuracy) ?? num(drill?.accuracy), answered, correct)
      : null;

  const verdict: SubjectVerdict = {
    accuracy,
    grade: accuracy === null ? null : getGrade(accuracy),
    answered,
    correct,
    topicsCovered: num(drill?.topicsCovered) ?? int(drill?.covered) ?? 0,
    topicsInScope: int(drill?.topicsInScope) ?? int(drill?.topicCount) ?? 0,
    secondsSpent: num(drill?.secondsSpent) ?? 0,
  };

  const groups: TopicGroups = {
    NEEDS_WORK: rowsFor(drill, "NEEDS_WORK"),
    NEEDS_REVISION: rowsFor(drill, "NEEDS_REVISION"),
    COMING_ALONG: rowsFor(drill, "COMING_ALONG"),
    UNPROVEN: rowsFor(drill, "UNPROVEN"),
    SOLID: rowsFor(drill, "SOLID"),
  };

  // backend-ported: the API does not yet resolve an answer-style profile or
  // insight findings, so default to the safe "nothing measured" shapes.
  const profile: Profile =
    answered < MIN_GRADED_ANSWERS
      ? { status: "insufficient", answered, needed: MIN_GRADED_ANSWERS }
      : { status: "ok", answered, bands: [], rapidGuessRate: 0, pacing: null };

  return {
    subject: subjectIdentity,
    verdict,
    groups,
    profile,
    insights: [],
  };
}