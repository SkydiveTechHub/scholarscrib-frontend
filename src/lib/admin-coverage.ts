import type { AdminCoveragePaperOut, CoverageFetchStatus } from "@/lib/api/types";

export type ExportFormat = "csv" | "json";
export type QuestionsTab = "coverage" | "all";

const LIST_FILTER_KEYS = ["subjectId", "examType", "examYear", "difficulty"] as const;

/** Which tab the URL asks for. Old list deep links (filters, no `tab`) open the list. */
export function resolveTab(params: { get(name: string): string | null }): QuestionsTab {
  const tab = params.get("tab");
  if (tab === "all" || tab === "coverage") return tab;
  return LIST_FILTER_KEYS.some((key) => params.get(key)) ? "all" : "coverage";
}

export function tabHref(tab: QuestionsTab): string {
  return `/admin/questions?tab=${tab}`;
}

/** The All questions tab, pre-filtered to one paper. */
export function listHref(filters: {
  subjectId: string;
  examType: string;
  examYear: number;
}): string {
  const query = new URLSearchParams({
    tab: "all",
    subjectId: filters.subjectId,
    examType: filters.examType,
    examYear: String(filters.examYear),
  });
  return `/admin/questions?${query.toString()}`;
}

export function paperKey(subjectId: string, examType: string, examYear: number): string {
  return `${subjectId}|${examType}|${examYear}`;
}

const EXAM_ORDER = ["WAEC", "JAMB", "NECO", "CUSTOM"];

export type ExamGroup = {
  examType: string;
  count: number;
  papers: AdminCoveragePaperOut[];
};

/**
 * A subject's papers grouped by exam type: known exams first in a fixed order,
 * then any others alphabetically. Papers keep their incoming (newest-first) order.
 */
export function groupPapersByExam(papers: AdminCoveragePaperOut[]): ExamGroup[] {
  const groups = new Map<string, ExamGroup>();
  for (const paper of papers) {
    const group = groups.get(paper.examType) ?? { examType: paper.examType, count: 0, papers: [] };
    group.count += paper.count;
    group.papers.push(paper);
    groups.set(paper.examType, group);
  }
  const rank = (type: string) => {
    const i = EXAM_ORDER.indexOf(type);
    return i === -1 ? EXAM_ORDER.length : i;
  };
  return [...groups.values()].sort(
    (a, b) => rank(a.examType) - rank(b.examType) || a.examType.localeCompare(b.examType),
  );
}

/** A badge for a paper the provider is still filling or failed to fill; none when complete or manual. */
export function fillBadge(
  status: CoverageFetchStatus | null,
): { label: string; tone: "amber" | "red" } | null {
  if (status === "PENDING") return { label: "Filling", tone: "amber" };
  if (status === "FAILED") return { label: "Fetch failed", tone: "red" };
  return null;
}

/** The name in a `Content-Disposition` header, stripped of any path, or `fallback`. */
export function filenameFromDisposition(
  header: string | null | undefined,
  fallback: string,
): string {
  const match = header?.match(/filename=(?:"([^"]*)"|([^;]+))/i);
  const raw = (match?.[1] ?? match?.[2] ?? "").trim();
  const name = raw.split(/[\\/]/).pop()?.trim() ?? "";
  return name || fallback;
}

export function exportParams(input: {
  subjectId: string;
  examType?: string;
  examYear?: number;
  format: ExportFormat;
}): Record<string, string> {
  const params: Record<string, string> = { subjectId: input.subjectId, format: input.format };
  if (input.examType) params.examType = input.examType;
  if (input.examYear !== undefined) params.examYear = String(input.examYear);
  return params;
}

/**
 * A question's options as [key, text] pairs. The column is a nullable JSON
 * blob, so anything but a plain object yields no options rather than a crash.
 */
export function optionEntries(options: unknown): [string, string][] {
  if (!options || typeof options !== "object" || Array.isArray(options)) return [];
  return Object.entries(options as Record<string, unknown>).map(([key, value]) => [
    key,
    value == null ? "" : String(value),
  ]);
}

/**
 * What to tell the admin when a download fails: the backend's own reason when
 * it refused ("No questions to export"), otherwise a plain network message
 * rather than axios' "Network Error".
 */
export function exportErrorMessage(error: unknown): string {
  // By name rather than `instanceof`: it holds even if the module is loaded twice.
  return error instanceof Error && error.name === "ApiError" && error.message
    ? error.message
    : "Could not reach the server. Nothing was downloaded.";
}
