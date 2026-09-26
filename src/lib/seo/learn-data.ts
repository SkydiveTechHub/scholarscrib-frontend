import { cache } from "react";
import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { TOPIC_SAMPLE_COUNT } from "./eligibility";
import { keepRenderable } from "./question-scope";
import { pickSamples } from "./samples";

/**
 * Public catalogue loaders, backed by the FastAPI catalogue endpoints:
 * `GET /api/subjects` (subject + optional topic listing) and
 * `GET /api/questions` (renderable sample questions). All mapping is tolerant —
 * the catalogue is curated on the backend, so subjects/topics that appear there
 * ARE the publishable set; the strict per-row gates that used to run in
 * Next.js (description present, ≥2 subtopics, ≥3 renderable objective
 * questions) now describe the backend's catalogue query, not this module's.
 */

export type PublicSubject = {
  slug: string;
  name: string;
  description: string;
  trackCategory: string;
  isWaec: boolean;
  isJamb: boolean;
  isNeco: boolean;
};

export type PublicSampleQuestion = {
  id: string;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
};

type PublicTopicMeta = {
  slug: string;
  title: string;
  description?: string | null;
};

type CatalogSubject = PublicSubject & {
  id?: string;
  topics?: Array<
    PublicTopicMeta & {
      id?: string;
      questionCount?: number;
      subtopics?: { title: string; description?: string | null }[];
      prerequisites?: {
        slug: string;
        title: string;
        rationale?: string | null;
        subjectSlug?: string;
      }[];
      waecWeight?: number;
      jambWeight?: number;
      estimatedMinutes?: number;
      updatedAt?: string | null;
    }
  >;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function booleanOf(value: unknown): boolean {
  return typeof value === "boolean" ? value : value === "true";
}

function toCatalogSubject(raw: unknown): CatalogSubject | null {
  if (!isRecord(raw)) return null;
  const slug = stringOf(raw.slug);
  const name = stringOf(raw.name);
  if (!slug || !name) return null;

  const topics = Array.isArray(raw.topics)
    ? raw.topics.flatMap((t) => {
        if (!isRecord(t)) return [];
        const topicSlug = stringOf(t.slug);
        const title = stringOf(t.title);
        if (!topicSlug || !title) return [];
        const prerequisites = Array.isArray(t.prerequisites)
          ? t.prerequisites.flatMap((p) => {
              if (!isRecord(p)) return [];
              const prereqSubjectSlug = stringOf(p.subjectSlug) || slug;
              return stringOf(p.slug) && stringOf(p.title)
                ? [{
                    slug: stringOf(p.slug),
                    title: stringOf(p.title),
                    rationale: stringOf(p.rationale) || null,
                    subjectSlug: prereqSubjectSlug,
                  }]
                : [];
            })
          : [];
        const subtopics = Array.isArray(t.subtopics)
          ? t.subtopics.flatMap((s) => {
              if (!isRecord(s) || !stringOf(s.title)) return [];
              return [{ title: stringOf(s.title), description: stringOf(s.description) || null }];
            })
          : [];
        return [{
          id: typeof t.id === "string" ? t.id : undefined,
          slug: topicSlug,
          title,
          description: stringOf(t.description) || null,
          questionCount:
            typeof t.questionCount === "number" ? t.questionCount : undefined,
          subtopics,
          prerequisites,
          waecWeight: numberOf(t.waecWeight),
          jambWeight: numberOf(t.jambWeight),
          estimatedMinutes: numberOf(t.estimatedMinutes),
          updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : null,
        }];
      })
    : [];

  return {
    slug,
    name,
    description: stringOf(raw.description),
    trackCategory: stringOf(raw.trackCategory),
    isWaec: booleanOf(raw.isWaec),
    isJamb: booleanOf(raw.isJamb),
    isNeco: booleanOf(raw.isNeco),
    id: typeof raw.id === "string" ? raw.id : undefined,
    topics,
  };
}

async function fetchCatalog(): Promise<CatalogSubject[]> {
  const payload = (await api(endpoints.subjects.list, { anonymous: true }).catch(
    () => null,
  )) as unknown;
  if (!isRecord(payload)) return [];
  const subjects = Array.isArray(payload.subjects)
    ? payload.subjects
    : Array.isArray(payload)
      ? payload
      : [];
  return subjects.flatMap((sub) => {
    const mapped = toCatalogSubject(sub);
    return mapped ? [mapped] : [];
  });
}

const loadCatalog = cache(fetchCatalog);

/**
 * Hub-publishable subjects: those whose catalogue entry carries at least one
 * topic. Previously derived from eligible-topic params; now the backend's
 * curated catalogue IS the eligibility decision.
 */
export const loadPublishableSubjects = cache(async (): Promise<PublicSubject[]> => {
  const subjects = await loadCatalog();
  return subjects
    .filter((subject) => (subject.topics?.length ?? 0) > 0)
    .map((subject) => ({
      slug: subject.slug,
      name: subject.name,
      description: subject.description,
      trackCategory: subject.trackCategory,
      isWaec: subject.isWaec,
      isJamb: subject.isJamb,
      isNeco: subject.isNeco,
    }));
});

export type PublicSubjectDetail = PublicSubject & {
  topics: { slug: string; title: string; description: string | null }[];
};

export const loadPublicSubject = cache(
  async (slug: string): Promise<PublicSubjectDetail | null> => {
    const subjects = await loadCatalog();
    const subject = subjects.find((candidate) => candidate.slug === slug);
    if (!subject) return null;
    return {
      slug: subject.slug,
      name: subject.name,
      description: subject.description,
      trackCategory: subject.trackCategory,
      isWaec: subject.isWaec,
      isJamb: subject.isJamb,
      isNeco: subject.isNeco,
      topics: (subject.topics ?? []).map((topic) => ({
        slug: topic.slug,
        title: topic.title,
        description: topic.description ?? null,
      })),
    };
  },
);

export type PublicTopic = {
  subject: { slug: string; name: string };
  slug: string;
  title: string;
  description: string | null;
  waecWeight: number;
  jambWeight: number;
  estimatedMinutes: number;
  subtopics: { title: string; description: string | null }[];
  prerequisites: {
    slug: string;
    title: string;
    rationale: string | null;
    subjectSlug: string;
  }[];
  siblings: { slug: string; title: string }[];
  questionCount: number;
  samples: PublicSampleQuestion[];
};

type PublicQuestionRow = {
  id: unknown;
  questionText: unknown;
  options: unknown;
  correctAnswer: unknown;
  explanation: unknown;
  createdAt: unknown;
};

async function fetchTopicQuestions(topicId: string): Promise<PublicQuestionRow[]> {
  const rows: PublicQuestionRow[] = [];
  for (let page = 1; page <= 4; page += 1) {
    const payload = (await api(endpoints.questions.list, {
      anonymous: true,
      params: { topicId, page, limit: 50 },
    }).catch(() => null)) as unknown;
    if (!isRecord(payload)) break;
    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    rows.push(
      ...questions.flatMap((q) =>
        isRecord(q) ? [{ ...q } as PublicQuestionRow] : [],
      ),
    );
    const pagination = isRecord(payload.pagination) ? payload.pagination : {};
    const total = Number(pagination.total);
    const count = rows.length;
    if (!Number.isFinite(total) || count >= total || page >= 4) break;
  }
  return rows;
}

export const loadPublicTopic = cache(
  async (subjectSlug: string, topicSlug: string): Promise<PublicTopic | null> => {
    const subjects = await loadCatalog();
    const subject = subjects.find((candidate) => candidate.slug === subjectSlug);
    if (!subject) return null;
    const topic = subject.topics?.find((candidate) => candidate.slug === topicSlug);
    if (!topic) return null;

    let questionCount = topic.questionCount ?? 0;
    let renderable: Array<PublicQuestionRow & { options: Record<string, string> }> = [];
    if (topic.id) {
      const questions = await fetchTopicQuestions(topic.id);
      renderable = keepRenderable(questions);
      if (renderable.length > 0) questionCount = renderable.length;
    } else if (questionCount === 0) {
      // No id and no count in the catalogue: nothing sample-able, so the page
      // degrades to a pure content page rather than a 404 — the topic itself
      // proved publishable by existing in the curated catalogue.
      questionCount = 0;
    }

    const siblingCandidates = (subject.topics ?? [])
      .filter((candidate) => candidate.slug !== topicSlug)
      .slice(0, 8);
    const siblings = siblingCandidates.map(({ slug, title }) => ({ slug, title }));

    const prerequisites = (topic.prerequisites ?? []).map((prereq) => ({
      slug: prereq.slug,
      title: prereq.title,
      rationale: prereq.rationale ?? null,
      subjectSlug: prereq.subjectSlug ?? subjectSlug,
    }));

    const sampleRows: PublicSampleQuestion[] = renderable.map((q) => ({
      id: stringOf(q.id),
      questionText: stringOf(q.questionText),
      options: q.options,
      correctAnswer: stringOf(q.correctAnswer),
      explanation: stringOf(q.explanation),
    }));

    return {
      subject: { slug: subject.slug, name: subject.name },
      slug: topic.slug,
      title: topic.title,
      description: topic.description ?? null,
      waecWeight: topic.waecWeight ?? 0,
      jambWeight: topic.jambWeight ?? 0,
      estimatedMinutes: topic.estimatedMinutes ?? 0,
      subtopics: (topic.subtopics ?? []).map((subtopic) => ({
        title: subtopic.title,
        description: subtopic.description ?? null,
      })),
      prerequisites,
      siblings,
      questionCount,
      samples: pickSamples(sampleRows, TOPIC_SAMPLE_COUNT, topic.id ?? topic.slug),
    };
  },
);

type EligibleTopic = {
  id?: string;
  subjectSlug: string;
  topicSlug: string;
  lastModified: Date | null;
};

/**
 * The one notion every topic-eligibility decision derives from: prerendered by
 * generateStaticParams, listed in the sitemap, linkable from a hub or another
 * topic's siblings/prerequisites, and NOT notFound()'d at request time. In the
 * API-only world this is simply the curated catalogue — the backend decides
 * what is publishable — so every catalogue topic is eligible. lastModified
 * comes from the topic's `updatedAt` when the catalogue provides one (the old
 * query derived it from the newest renderable question, which the public
 * catalogue does not expose).
 */
const loadEligibleTopics = cache(async (): Promise<EligibleTopic[]> => {
  const subjects = await loadCatalog();
  return subjects.flatMap((subject) =>
    (subject.topics ?? []).map((topic) => ({
      id: topic.id,
      subjectSlug: subject.slug,
      topicSlug: topic.slug,
      lastModified:
        typeof topic.updatedAt === "string" && topic.updatedAt
          ? new Date(topic.updatedAt)
          : null,
    })),
  );
});

/** Params for generateStaticParams and for the sitemap. */
export const loadEligibleTopicParams = cache(async () => {
  const topics = await loadEligibleTopics();
  return topics.map(({ subjectSlug, topicSlug, lastModified }) => ({
    subjectSlug,
    topicSlug,
    lastModified,
  }));
});

/** Slugs whose topic pages actually exist, so hubs never link into a 404. */
export const loadEligibleTopicSlugs = cache(
  async (subjectSlug: string): Promise<Set<string>> => {
    const topics = await loadEligibleTopics();
    return new Set(
      topics
        .filter((topic) => topic.subjectSlug === subjectSlug)
        .map((topic) => topic.topicSlug),
    );
  },
);

/**
 * Ids whose topic pages actually exist, for filtering a topic's own siblings
 * and prerequisites (which may span subjects) so a page that survived the gate
 * never links to one that didn't.
 */
export const loadEligibleTopicIds = cache(async (): Promise<Set<string>> => {
  const topics = await loadEligibleTopics();
  return new Set(topics.flatMap((topic) => (topic.id ? [topic.id] : [])));
});