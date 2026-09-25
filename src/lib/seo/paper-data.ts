import { cache } from "react";
import { api } from "@/lib/api/server";
import { PAPER_SAMPLE_COUNT, isPaperPageEligible } from "./eligibility";
import { examSegmentFor, type PublicExamType } from "./exam-segment";
import { loadEligibleTopicIds, type PublicSampleQuestion } from "./learn-data";
import { keepRenderable } from "./question-scope";
import { pickSamples } from "./samples";

/**
 * Public past-paper loaders backed by the catalogue endpoints:
 * `GET /api/questions/past-papers` (paper summaries per exam) and
 * `GET /api/questions` (renderable question pages). Mapping is tolerant; the
 * backend's past-papers listing is the eligibility source, so a paper present
 * there with a real question count is publishable by definition.
 */

type PaperSummaryRow = {
  examType?: unknown;
  examYear?: unknown;
  subjectId?: unknown;
  subjectSlug?: unknown;
  subjectName?: unknown;
  trackCategory?: unknown;
  questionCount?: unknown;
  cached?: unknown;
  lastModified?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

type EligiblePaper = {
  examSegment: string;
  subjectSlug: string;
  year: number;
  questionCount: number;
  lastModified: Date | null;
};

async function fetchPapers(examType?: string): Promise<PaperSummaryRow[]> {
  const payload = (await api("/api/questions/past-papers", {
    anonymous: true,
    params: { examType },
  }).catch(() => null)) as unknown;
  if (!isRecord(payload)) return [];
  const rows = Array.isArray(payload.papers)
    ? payload.papers
    : Array.isArray(payload)
      ? payload
      : [];
  return rows.filter(isRecord);
}

export const loadExamSubjects = cache(async (examType: PublicExamType) => {
  const rows = await fetchPapers(examType);
  const subjects = new Map<string, { slug: string; name: string; questionCount: number }>();
  for (const row of rows) {
    if (stringOf(row.examType) !== examType) continue;
    const slug = stringOf(row.subjectSlug);
    const name = stringOf(row.subjectName) || slug;
    if (!slug) continue;
    const count = numberOrNull(row.questionCount) ?? 0;
    const current = subjects.get(slug);
    subjects.set(slug, {
      slug,
      name,
      questionCount: (current?.questionCount ?? 0) + count,
    });
  }
  return [...subjects.values()].sort((a, b) => a.name.localeCompare(b.name));
});

export const loadPaperYears = cache(
  async (examType: PublicExamType, subjectSlug: string) => {
    const papers = await fetchPapers();
    const subjectRow = papers.find(
      (row) =>
        stringOf(row.examType) === examType &&
        stringOf(row.subjectSlug) === subjectSlug,
    );
    if (!subjectRow) return null;
    const subject = {
      slug: subjectSlug,
      name: stringOf(subjectRow.subjectName) || subjectSlug,
    };

    const examSegment = examSegmentFor(examType);
    const eligibleParams = await loadEligiblePaperParams();

    return {
      subject,
      years: eligibleParams
        .filter((p) => p.examSegment === examSegment && p.subjectSlug === subjectSlug)
        .map((p) => ({ year: p.year, questionCount: p.questionCount }))
        .sort((a, b) => b.year - a.year),
    };
  },
);

export type PublicPaper = {
  examType: PublicExamType;
  year: number;
  subject: { slug: string; name: string };
  questionCount: number;
  topics: {
    slug: string | null;
    subjectSlug: string | null;
    title: string;
    questionCount: number;
  }[];
  samples: PublicSampleQuestion[];
  adjacentYears: { previous: number | null; next: number | null };
  lastModified: Date | null;
};

type PublicQuestionRow = {
  id: unknown;
  questionText: unknown;
  options: unknown;
  correctAnswer: unknown;
  explanation: unknown;
  createdAt: unknown;
  topic?: {
    id?: unknown;
    slug?: unknown;
    title?: unknown;
    subject?: { slug?: unknown };
  };
};

async function fetchPaperQuestions(
  params: Record<string, string | number>,
): Promise<PublicQuestionRow[]> {
  const rows: PublicQuestionRow[] = [];
  for (let page = 1; page <= 8; page += 1) {
    const payload = (await api("/api/questions", {
      anonymous: true,
      params: { ...params, page, limit: 50 },
    }).catch(() => null)) as unknown;
    if (!isRecord(payload)) break;
    rows.push(
      ...(Array.isArray(payload.questions) ? payload.questions : []).flatMap((q) =>
        isRecord(q) ? [{ ...q } as PublicQuestionRow] : [],
      ),
    );
    const pagination = isRecord(payload.pagination) ? payload.pagination : {};
    const total = Number(pagination.total);
    const count = rows.length;
    if (!Number.isFinite(total) || count >= total || page >= 8) break;
  }
  return rows;
}

export const loadPaper = cache(
  async (
    examType: PublicExamType,
    subjectSlug: string,
    year: number,
  ): Promise<PublicPaper | null> => {
    const papers = await fetchPapers();
    const paper = papers.find(
      (row) =>
        stringOf(row.examType) === examType &&
        stringOf(row.subjectSlug) === subjectSlug &&
        numberOrNull(row.examYear) === year,
    );
    if (!paper) return null;
    const subject = {
      slug: subjectSlug,
      name: stringOf(paper.subjectName) || subjectSlug,
    };

    const questions = await fetchPaperQuestions({
      examType,
      subjectId: stringOf(paper.subjectId),
      examYear: year,
    });

    const renderable = keepRenderable(questions);
    if (!isPaperPageEligible({ publicQuestionCount: renderable.length })) return null;

    // A row every topic breakdown links out to must itself be a publishable
    // topic page (loadEligibleTopicIds — the same source /learn filters
    // against). A row for an ineligible topic still appears, so the counts
    // keep summing to the paper's real question count; it just renders with
    // slug: null, i.e. as plain text instead of a link.
    const eligibleTopicIds = await loadEligibleTopicIds();

    const byTopic = new Map<
      string,
      {
        slug: string | null;
        subjectSlug: string | null;
        title: string;
        questionCount: number;
      }
    >();
    for (const question of renderable) {
      const topic = isRecord(question.topic) ? question.topic : null;
      const slug = stringOf(topic?.slug) || null;
      const title = stringOf(topic?.title) || "General";
      const topicSubjectSlug = isRecord(topic?.subject) ? stringOf(topic.subject.slug) : "";
      const topicId = stringOf(topic?.id);
      const isEligible = Boolean(topicId && eligibleTopicIds.has(topicId));
      const existing = byTopic.get(title);
      if (existing) {
        existing.questionCount += 1;
        if (isEligible && !existing.slug) {
          existing.slug = slug;
          existing.subjectSlug = topicSubjectSlug || null;
        }
      } else {
        byTopic.set(title, {
          slug: isEligible ? slug : null,
          subjectSlug: isEligible ? (topicSubjectSlug || null) : null,
          title,
          questionCount: 1,
        });
      }
    }

    // Same shared source as loadPaperYears, and for the same reason: a paper
    // count here previously admitted a neighbour year with >=10 public but <10
    // renderable questions into the prev/next links, which then 404'd when
    // followed.
    const examSegment = examSegmentFor(examType);
    const eligibleParams = await loadEligiblePaperParams();
    const eligibleYears = eligibleParams
      .filter((p) => p.examSegment === examSegment && p.subjectSlug === subjectSlug)
      .map((p) => p.year)
      .sort((a, b) => a - b);

    const index = eligibleYears.indexOf(year);
    const newest = renderable.reduce<Date | null>(
      (latest, q) => {
        const at = new Date(q.createdAt as string);
        if (Number.isNaN(at.getTime())) return latest;
        return !latest || at > latest ? at : latest;
      },
      null,
    );

    const sampleRows: PublicSampleQuestion[] = renderable.map((q) => ({
      id: stringOf(q.id),
      questionText: stringOf(q.questionText),
      options: q.options,
      correctAnswer: stringOf(q.correctAnswer),
      explanation: stringOf(q.explanation),
    }));

    return {
      examType,
      year,
      subject,
      questionCount: renderable.length,
      topics: [...byTopic.values()].sort((a, b) => b.questionCount - a.questionCount),
      samples: pickSamples(
        sampleRows,
        PAPER_SAMPLE_COUNT,
        `${examType}:${subject.slug}:${year}`,
      ),
      adjacentYears: {
        previous: index > 0 ? eligibleYears[index - 1] : null,
        next: index >= 0 && index < eligibleYears.length - 1 ? eligibleYears[index + 1] : null,
      },
      lastModified: newest,
    };
  },
);

/**
 * The one source every paper-eligibility decision derives from: prerendered by
 * generateStaticParams, listed in the sitemap, offered as a year link from
 * `/past-questions/[exam]/[subjectSlug]`, offered as a prev/next link from a
 * neighbouring paper, and NOT notFound()'d at request time. The backend's
 * past-papers listing is curated (cached papers with real question counts),
 * so papers that match the eligibility floor — at least PAPER_MIN_QUESTIONS
 * questions, no CUSTOM exam, subject resolvable to a slug — are eligible.
 */
export const loadEligiblePaperParams = cache(async () => {
  const rows = await fetchPapers();

  const eligible: EligiblePaper[] = [];
  for (const row of rows) {
    const count = numberOrNull(row.questionCount);
    if (count === null || !isPaperPageEligible({ publicQuestionCount: count })) continue;
    const examType = stringOf(row.examType);
    const examSegment = examSegmentFor(examType);
    const subjectSlug = stringOf(row.subjectSlug);
    const year = numberOrNull(row.examYear);
    if (!examSegment || !subjectSlug || year === null) continue;
    eligible.push({
      examSegment,
      subjectSlug,
      year,
      questionCount: count,
      lastModified:
        row.lastModified != null && stringOf(row.lastModified)
          ? new Date(stringOf(row.lastModified))
          : null,
    });
  }

  return eligible;
});