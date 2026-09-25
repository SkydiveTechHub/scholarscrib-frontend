import { api } from "@/lib/api/server";
import { getGrade } from "@/lib/utils";
import type { AttemptResultOut } from "@/lib/api/types";

// The results payload has one shape, built one way. Submitting an attempt and
// re-opening it later previously ran two hand-maintained copies of this mapping.
// The backend now owns the attempt and its grading; this module maps its result
// payload back onto the shape the results screen renders.

export type TopicBreakdownRow = {
  topicId: string;
  topicTitle: string;
  correct: number;
  total: number;
  accuracy: number;
  status: "strong" | "competent" | "developing" | "weak";
};

/** The payload's own coverage of the attempt, beyond the typed contract. */
type AttemptPayload = AttemptResultOut & {
  timeSpentSeconds?: unknown;
  awayEvents?: unknown;
  jamb?: unknown;
};

type JambResult = {
  perSubject: {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    correct: number;
    total: number;
    marks: number;
  }[];
  score: number;
  totalMarks: number;
  percentage: number;
  band: { label: string; remark: string };
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * `Question.options` is a Json column in the transport contract too, so every
 * row the importer writes is a `{ "A": "…", "B": "…" }` map; anything else is
 * treated as an unrenderable question rather than trusted.
 */
function asOptions(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value).filter(
    ([, v]) => typeof v === "string",
  ) as [string, string][];
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function statusFor(accuracy: number): TopicBreakdownRow["status"] {
  if (accuracy >= 80) return "strong";
  if (accuracy >= 60) return "competent";
  if (accuracy >= 40) return "developing";
  return "weak";
}

function topicIdOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (isRecord(value)) {
    const id = value.id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

// backend-ported: the backend usually ships the band; when it does not, derive
// the same guidance from the 400-point score (mirrors lib/jamb-cbt jambBand).
function jambBandFromScore(score: number): { label: string; remark: string } {
  if (score >= 300) {
    return { label: "Excellent", remark: "Competitive for any course nationwide." };
  }
  if (score >= 250) {
    return { label: "Strong", remark: "Above the cut-off for most competitive courses." };
  }
  if (score >= 200) {
    return { label: "Good", remark: "Meets the general benchmark for university admission." };
  }
  if (score >= 160) {
    return { label: "Fair", remark: "Around the national minimum — worth pushing higher." };
  }
  return { label: "Needs work", remark: "Below the usual benchmark. Focus on your weakest subject." };
}

function asJamb(value: unknown): JambResult | null {
  if (!isRecord(value)) return null;
  const score = num(value.score);
  if (score === null) return null;
  const totalMarks = num(value.totalMarks) ?? 400;

  const perSubject = (Array.isArray(value.perSubject) ? value.perSubject : [])
    .map((row) => {
      const r = isRecord(row) ? row : {};
      const correct = num(r.correct) ?? 0;
      const total = num(r.total) ?? 0;
      return {
        subjectId: str(r.subjectId) ?? "",
        subjectCode: str(r.subjectCode) ?? "",
        subjectName: str(r.subjectName) ?? "Unknown",
        correct,
        total,
        marks:
          num(r.marks) ??
          (total > 0 ? (correct / total) * 100 : 0),
      };
    })
    .filter((r) => r.subjectId !== "" || r.subjectName !== "Unknown");

  const band = isRecord(value.band)
    ? {
        label: str(value.band.label) ?? "",
        remark: str(value.band.remark) ?? "",
      }
    : jambBandFromScore(score);

  return {
    perSubject,
    score,
    totalMarks,
    percentage:
      num(value.percentage) ??
      (totalMarks > 0 ? Math.round((score / totalMarks) * 100 * 10) / 10 : 0),
    band,
  };
}

/**
 * Full result payload for a completed attempt, or `null` when the attempt does
 * not exist or belongs to someone else (ownership is enforced server-side —
 * `studentId` is kept for callers).
 */
export async function buildAttemptResult(
  attemptId: string,
  _studentId: string,
) {
  const data = await api<AttemptPayload>(
    `/api/assessments/attempts/${attemptId}`,
  );

  const results = (data.results ?? []).map((row) => ({
    questionId: str(row.questionId) ?? str(row.id) ?? "",
    questionText: String(row.questionText ?? row.question ?? ""),
    questionImageUrl: str(row.questionImageUrl),
    options: asOptions(row.options),
    selectedAnswer: str(row.selectedAnswer),
    correctAnswer: String(row.correctAnswer ?? ""),
    isCorrect: row.isCorrect === true,
    explanation: String(row.explanation ?? ""),
    explanationImageUrl: str(row.explanationImageUrl),
    topic: topicIdOf(row.topicId) ?? topicIdOf(row.topic),
    difficulty: String(row.difficulty ?? ""),
    timeSpentSeconds: num(row.timeSpentSeconds) ?? 0,
  }));

  const topicBreakdown: TopicBreakdownRow[] = (
    data.topicBreakdown ?? []
  ).map((row) => {
    const correct = num(row.correct) ?? 0;
    const total = num(row.total) ?? 0;
    const accuracy = num(row.accuracy) ?? (total > 0 ? (correct / total) * 100 : 0);
    return {
      topicId: str(row.topicId) ?? str(row.id) ?? "",
      topicTitle: str(row.topicTitle) ?? str(row.title) ?? "General",
      correct,
      total,
      accuracy,
      status: statusFor(accuracy),
    };
  });

  const score = num(data.score) ?? 0;
  const totalMarks = num(data.totalMarks) ?? 0;
  const percentage = Math.round(
    (num(data.percentage) ?? (totalMarks > 0 ? (score / totalMarks) * 100 : 0)) *
      10,
  ) / 10;
  const gradeInfo = getGrade(percentage);

  return {
    attemptId: str(data.attemptId) ?? attemptId,
    assessmentTitle: String(data.assessmentTitle ?? ""),
    assessmentType: String(data.assessmentType ?? ""),
    examYear: num(data.examYear),
    /** Present only for JAMB CBT papers. */
    jamb: asJamb(data.jamb),
    score,
    totalMarks,
    percentage,
    grade: data.grade ?? gradeInfo.grade,
    gradeRemark: data.gradeRemark ?? gradeInfo.remark,
    isCredit: data.isCredit ?? gradeInfo.isCredit,
    timeSpentSeconds: num(data.timeSpentSeconds) ?? 0,
    awayEvents: typeof data.awayEvents === "number" ? data.awayEvents : undefined,
    totalQuestions: num(data.totalQuestions) ?? results.length,
    correctCount:
      num(data.correctCount) ?? results.filter((r) => r.isCorrect).length,
    results,
    topicBreakdown,
  };
}