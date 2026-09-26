import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { summariseSubjects, toStatRows, type StatRow } from "./admin-stats";
import {
  groupByClass,
  levelsPresent,
  type ClassSection,
  type LessonFilter,
} from "./admin-lesson-browse";
import type { ClassLevel, Term } from "./curriculum-scope";
import type { AcademicTermRow } from "./academic-terms";

/**
 * Backend reads for the admin pages. Kept apart from `admin-stats`,
 * `admin-question` and `admin-lesson`, which stay pure so their tests can run
 * without a database. Every function here talks to the FastAPI backend over
 * the admin realm, never to a local database.
 */

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : String(value);
}

function asFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

/** `Row.term` / `Row.classLevel` from the backend come back as plain strings. */
function rowAs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export type AdminOverviewData = {
  total: number;
  subjectCount: number;
  topicCount: number;
  unlinkedCount: number;
  subjectRows: StatRow[];
  /** Subject code by subject id, for the code column on the subject table. */
  codeBySubjectId: Record<string, string>;
  emptySubjects: { id: string; name: string; code: string }[];
  examRows: StatRow[];
  difficultyRows: StatRow[];
  examYears: number[];
};

/**
 * Console-home counts and breakdowns.
 *
 * // backend-ported: assumes `GET /admin/api/overview` returns
 * `{ total?, subjectCount?, topicCount?, unlinkedCount?, subjects:
 * [{ id, name, code, questionCount }], byExam?: [{ key, label?, count }],
 * byDifficulty?: [{ key, label?, count }], examYears?: number[] }`. Every
 * field is tolerated — the table renders from whatever is present.
 */
export async function getAdminOverview(): Promise<AdminOverviewData> {
  const payload = rowAs(
    await api<unknown>(endpoints.admin.overview, { realm: "admin" }),
  );

  const subjects: Array<{ id: string; name: string; code: string; questionCount: number }> =
    Array.isArray(payload.subjects)
      ? payload.subjects.map((raw) => {
          const s = rowAs(raw);
          return {
            id: asString(s.id),
            name: asString(s.name),
            code: asString(s.code),
            questionCount: asFiniteNumber(s.questionCount),
          };
        })
      : [];
  const summary = summariseSubjects(subjects);

  const codeBySubjectId: Record<string, string> = {};
  for (const s of subjects) codeBySubjectId[asString(s.id)] = asString(s.code);

  const toRows = (list: unknown[]): StatRow[] =>
    toStatRows(
      list.map((raw, i) => {
        const r = rowAs(raw);
        const key = asString(r.key, `entry-${i + 1}`);
        return {
          key,
          label: asString(r.label, key),
          count: asFiniteNumber(r.count),
        };
      }),
      summary.total,
    );

  const years = Array.isArray(payload.examYears)
    ? payload.examYears.filter((y): y is number => typeof y === "number" && Number.isFinite(y))
    : [];
  const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

  return {
    total: summary.total,
    subjectCount: subjects.length,
    topicCount: asFiniteNumber(payload.topicCount),
    unlinkedCount: asFiniteNumber(payload.unlinkedCount),
    subjectRows: summary.rows,
    codeBySubjectId,
    emptySubjects: summary.empty.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
    })),
    examRows: toRows(Array.isArray(payload.byExam) ? payload.byExam : []),
    difficultyRows: toRows(Array.isArray(payload.byDifficulty) ? payload.byDifficulty : []),
    examYears: uniqueYears,
  };
}

export type QuestionFormOptions = {
  subjects: { id: string; name: string; code: string }[];
  topics: { id: string; title: string; subjectId: string }[];
};

/**
 * Subject and topic pickers for the question create/edit forms.
 *
 * // backend-ported: assumes `GET /admin/api/questions/form-options` returns
 * `{ subjects: [{ id, name, code }], topics: [{ id, title, subjectId }] }`.
 */
export async function getQuestionFormOptions(): Promise<QuestionFormOptions> {
  const payload = rowAs(
    await api<unknown>(endpoints.admin.questions.formOptions, { realm: "admin" }),
  );
  return {
    subjects: (Array.isArray(payload.subjects) ? payload.subjects : []).map((s) => {
      const r = rowAs(s);
      return { id: asString(r.id), name: asString(r.name), code: asString(r.code) };
    }),
    topics: (Array.isArray(payload.topics) ? payload.topics : []).map((t) => {
      const r = rowAs(t);
      return { id: asString(r.id), title: asString(r.title), subjectId: asString(r.subjectId) };
    }),
  };
}

export type LessonUploadSubject = {
  id: string;
  name: string;
  slug: string;
  topics: {
    id: string;
    title: string;
    slug: string;
    curriculumLevel: { classLevel: string; term: string };
  }[];
};

export type LessonTopicRow = {
  topicId: string;
  topicTitle: string;
  classLevel: ClassLevel;
  term: Term;
  blockCount: number;
  authored: boolean;
};

export type AdminLessonBrowseData = {
  subjects: { id: string; name: string; trackCategory: string }[];
  rows: LessonTopicRow[];
  sections: ClassSection<LessonTopicRow>[];
  classLevels: ClassLevel[];
  terms: Term[];
  authoredCount: number;
  selectedSubjectName: string | null;
};

/**
 * The lesson browse tree for one subject's topics.
 *
 * // backend-ported: assumes `GET /admin/api/lesson-browse` (params
 * `subjectId`, `classLevel`, `term`) returns `{ subjects: [{ id, name,
 * trackCategory }], rows: [{ topicId, topicTitle, classLevel, term,
 * blockCount, authored }], levels?: [{ classLevel, term }] }`. `levels` is
 * the subject's whole topic set used to build the class/term dropdowns; when
 * absent, the dropdowns fall back to the filtered rows.
 */
export async function getAdminLessonBrowseData(
  filter: LessonFilter,
): Promise<AdminLessonBrowseData> {
  const params: Record<string, string> = {};
  if (filter.subjectId) params.subjectId = filter.subjectId;
  if (filter.classLevel) params.classLevel = filter.classLevel;
  if (filter.term) params.term = filter.term;

  const payload = rowAs(
    await api<unknown>(endpoints.admin.lessons.browse, { realm: "admin", params }),
  );

  const subjects = (Array.isArray(payload.subjects) ? payload.subjects : []).map(
    (s) => {
      const r = rowAs(s);
      return {
        id: asString(r.id),
        name: asString(r.name),
        trackCategory: asString(r.trackCategory),
      };
    },
  );

  const rows: LessonTopicRow[] = (
    Array.isArray(payload.rows) ? payload.rows : []
  ).map((raw) => {
    const r = rowAs(raw);
    return {
      topicId: asString(r.topicId),
      topicTitle: asString(r.topicTitle),
      classLevel: asString(r.classLevel) as ClassLevel,
      term: asString(r.term) as Term,
      blockCount: asFiniteNumber(r.blockCount),
      authored: Boolean(r.authored),
    };
  });

  const levelSource = Array.isArray(payload.levels)
    ? (payload.levels as unknown[]).map((l) => {
        const r = rowAs(l);
        return { classLevel: asString(r.classLevel), term: asString(r.term) };
      })
    : rows.map((r) => ({ classLevel: r.classLevel, term: r.term }));
  const { classLevels, terms } = levelsPresent(levelSource, filter.classLevel);

  return {
    subjects,
    rows,
    sections: groupByClass(rows),
    classLevels,
    terms,
    authoredCount: rows.filter((r) => r.authored).length,
    selectedSubjectName:
      subjects.find((s) => s.id === filter.subjectId)?.name ?? null,
  };
}

export type EditQuestionPayload = {
  id: string;
  subjectId: string;
  topicId: string | null;
  examType: "WAEC" | "JAMB" | "NECO" | "CUSTOM";
  examYear: number | null;
  questionNumber: number | null;
  questionText: string;
  questionImageUrl: string | null;
  questionType: "OBJECTIVE" | "THEORY" | "FILL_IN_BLANK";
  options: Record<string, string> | null;
  correctAnswer: string;
  explanation: string;
  explanationImageUrl: string | null;
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  marks: number;
  timeEstimateSeconds: number;
};

/**
 * `Question.options` is a nullable Json blob, so it could be a string, number,
 * array, or anything else a stray write put there. Only a plain, non-array
 * object of string values is a valid options map; anything else is treated as
 * absent rather than cast blindly (which would otherwise crash the form).
 */
function toOptionsRecord(value: unknown): Record<string, string> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = typeof val === "string" ? val : String(val);
  }
  return out;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return asFiniteNumber(value) || null;
}

/** The question being edited plus the form's pickers, or null if it is gone. */
export async function getQuestionForEdit(
  id: string,
): Promise<
  | { question: EditQuestionPayload; subjects: QuestionFormOptions["subjects"]; topics: QuestionFormOptions["topics"] }
  | null
> {
  const [payload, options] = await Promise.all([
    api<unknown>(endpoints.admin.questions.detail(id), { realm: "admin" }),
    getQuestionFormOptions(),
  ]);
  const raw = rowAs(payload);
  if (!asString(raw.id)) return null;

  return {
    question: {
      id: asString(raw.id),
      subjectId: asString(raw.subjectId),
      topicId: nullableString(raw.topicId),
      examType: (asString(raw.examType) || "WAEC") as EditQuestionPayload["examType"],
      examYear: asNullableNumber(raw.examYear),
      questionNumber: asNullableNumber(raw.questionNumber),
      questionText: asString(raw.questionText),
      questionImageUrl: nullableString(raw.questionImageUrl),
      questionType: (asString(raw.questionType) || "OBJECTIVE") as EditQuestionPayload["questionType"],
      options: toOptionsRecord(raw.options),
      correctAnswer: asString(raw.correctAnswer),
      explanation: asString(raw.explanation),
      explanationImageUrl: nullableString(raw.explanationImageUrl),
      difficulty: (asString(raw.difficulty) || "INTERMEDIATE") as EditQuestionPayload["difficulty"],
      marks: asFiniteNumber(raw.marks) || 1,
      timeEstimateSeconds: asFiniteNumber(raw.timeEstimateSeconds) || 90,
    },
    subjects: options.subjects,
    topics: options.topics,
  };
}

/**
 * The subject → topic tree the lesson upload form picks a target from.
 *
 * // backend-ported: assumes the admin lesson-tree endpoint returns
 * `{ subjects: [{ id, name, slug, topics: [{ id, title, slug,
 * curriculumLevel: { classLevel, term } }] }] }` (the same shape as the
 * `LessonTreeOut` type used elsewhere).
 */
export async function getLessonUploadSubjects(): Promise<LessonUploadSubject[]> {
  const payload = rowAs(
    await api<unknown>(endpoints.admin.lessons.tree, { realm: "admin" }),
  );
  return (Array.isArray(payload.subjects) ? payload.subjects : []).map((s) => {
    const r = rowAs(s);
    const topics = Array.isArray(r.topics) ? r.topics : [];
    return {
      id: asString(r.id),
      name: asString(r.name),
      slug: asString(r.slug),
      topics: topics.map((t) => {
        const tr = rowAs(t);
        const level = rowAs(tr.curriculumLevel);
        return {
          id: asString(tr.id),
          title: asString(tr.title),
          slug: asString(tr.slug),
          curriculumLevel: {
            classLevel: asString(level.classLevel),
            term: asString(level.term),
          },
        };
      }),
    };
  });
}

/**
 * Academic terms for the console, ordered by start date.
 *
 * // backend-ported: `GET /admin/api/academic-terms` returns an array of
 * `{ id, session, term, startsOn, endsOn }` with `YYYY-MM-DD` dates, already
 * ordered by `startsOn`. Kept here (not in `src/lib/academic-terms.ts`)
 * because that module still serves the student study-plan and stays local.
 */
export async function listAcademicTerms(): Promise<AcademicTermRow[]> {
  const out = await api<unknown>(endpoints.admin.academicTerms.list, { realm: "admin" });
  const rows = Array.isArray(out)
    ? out
    : (rowAs(out).terms as unknown[] | undefined) ?? [];
  return rows.map((raw) => {
    const r = rowAs(raw);
    return {
      id: asString(r.id),
      session: asString(r.session),
      term: asString(r.term) as Term,
      startsOn: asString(r.startsOn),
      endsOn: asString(r.endsOn),
    };
  });
}