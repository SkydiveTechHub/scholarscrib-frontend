"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuCircleAlert,
  LuSearch,
  LuUpload,
} from "react-icons/lu";
import { HIDE_BELOW } from "@/components/admin/admin-table";
import { StatusBanner } from "@/components/admin/status-banner";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import {
  useCoverageQuestions,
  useImportCoverageQuestions,
  useSubjectCatalogue,
} from "@/hooks/api/use-admin-questions";
import { cn } from "@/lib/utils";

interface CoverageQuestion {
  id: string;
  questionNumber: number | null;
  questionText: string;
  questionType: string;
  examType: string;
  examYear: number | null;
  country: string;
  difficulty: string;
  hasPassage: boolean;
  subject: { name: string; code: string };
  topic: { title: string; slug: string } | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type ImportOutcome =
  | { ok: true; message: string; errors: Array<{ index: number; reason: string }> }
  | { ok: false; message: string };

const TH_CLS = "text-[11px] font-semibold uppercase tracking-wider text-muted";
const FIELD_CLS =
  "w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
const LABEL_CLS = "text-[11px] font-semibold uppercase tracking-wider text-muted";

/** Reads a file or pasted text as either an array of rows or `{ questions: [...] }`. */
function parseRows(raw: string): { rows: unknown[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "That is not valid JSON. Check for a trailing comma or a missing bracket." };
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null;
  if (!rows) {
    return { error: 'Expected an array of questions or an object shaped { "questions": [ ... ] }.' };
  }
  if (rows.length === 0) return { error: "The file contains no questions." };
  if (rows.length > 500) {
    return { error: `${rows.length} rows exceeds the 500-row limit. Split the file into batches.` };
  }
  return { rows };
}

function ImportPanel({ onClose }: { onClose: () => void }) {
  const importQuestions = useImportCoverageQuestions();
  const [raw, setRaw] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const fileId = useId();
  const textId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setRaw(await file.text());
      setError(null);
    } catch {
      setError("Could not read that file. Choose a JSON file and try again.");
    }
  }

  async function handleImport() {
    const parsed = parseRows(raw);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setOutcome(null);
    try {
      const data = await importQuestions.mutateAsync({ questions: parsed.rows, skipDuplicates });
      setOutcome({
        ok: true,
        message: data.message,
        errors: (data.errors ?? []) as Array<{ index: number; reason: string }>,
      });
      if (data.imported > 0) {
        setRaw("");
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch (e) {
      setOutcome({
        ok: false,
        message: e instanceof Error ? e.message : "Could not reach the server. Nothing was imported.",
      });
    }
  }

  return (
    <div className="mb-6 space-y-4 rounded-lg border border-border-strong bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Import coverage questions</p>
          <p className="mt-1 text-sm text-muted">
            A JSON array of questions, or <code>{`{ "questions": [ ... ] }`}</code>, up to 500 per
            batch. Each row needs <code>subjectCode</code>, <code>examType</code>,{" "}
            <code>questionText</code>, <code>correctAnswer</code> and <code>explanation</code>.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {error && <StatusBanner tone="error" title="Cannot import" message={error} />}

      <div>
        <label htmlFor={fileId} className="block text-sm font-semibold text-foreground">
          Upload a JSON file
        </label>
        <input
          ref={fileRef}
          id={fileId}
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          className="mt-1 block text-sm text-muted"
        />
      </div>

      <div>
        <label htmlFor={textId} className="block text-sm font-semibold text-foreground">
          Or paste JSON
        </label>
        <textarea
          id={textId}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          spellCheck={false}
          className={cn(FIELD_CLS, "mt-1 font-mono text-xs")}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={skipDuplicates}
          onChange={(e) => setSkipDuplicates(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        Skip questions already in this table
      </label>

      <Button onClick={handleImport} disabled={!raw.trim() || importQuestions.isPending}>
        {importQuestions.isPending ? "Importing…" : "Import"}
      </Button>

      {outcome && (
        <div>
          <StatusBanner
            tone={outcome.ok ? (outcome.errors.length ? "info" : "success") : "error"}
            title={outcome.ok ? "Import finished" : "Import failed"}
            message={outcome.message}
          />
          {outcome.ok && outcome.errors.length > 0 && (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-muted">
              {outcome.errors.map((err) => (
                <li key={`${err.index}-${err.reason}`}>
                  Row <span className="tabular-nums">{err.index + 1}</span>: {err.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function CoverageTab() {
  const [importOpen, setImportOpen] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [examFilter, setExamFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [page, setPage] = useState(1);

  const subjectCatalogue = useSubjectCatalogue();
  const subjects = useMemo(
    () =>
      ((subjectCatalogue.data?.subjects ?? []) as Array<{ id: string; name: string }>)
        .map((s) => ({ id: s.id, name: s.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [subjectCatalogue.data],
  );

  const params = useMemo(() => {
    const next: Record<string, string> = { page: String(page), pageSize: "20" };
    if (appliedQuery) next.search = appliedQuery;
    if (examFilter) next.examType = examFilter;
    if (subjectFilter) next.subjectId = subjectFilter;
    if (/^\d{4}$/.test(yearFilter)) next.examYear = yearFilter;
    return next;
  }, [page, appliedQuery, examFilter, subjectFilter, yearFilter]);

  const query = useCoverageQuestions(params);
  const questions = (query.data?.questions ?? []) as unknown as CoverageQuestion[];
  const pagination = (query.data?.pagination ?? null) as unknown as Pagination | null;
  const retrying = query.isError && query.isFetching;
  const loading = query.isPending || query.isPlaceholderData || retrying;
  const error =
    query.isError && !retrying
      ? query.error instanceof Error
        ? query.error.message
        : "Could not reach the server. Check your connection and retry."
      : null;
  const hasFilters = appliedQuery || examFilter || subjectFilter || yearFilter;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedQuery(queryInput);
    setPage(1);
  }

  function handleClear() {
    setQueryInput("");
    setAppliedQuery("");
    setExamFilter("");
    setSubjectFilter("");
    setYearFilter("");
    setPage(1);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {pagination ? `${pagination.total} total` : "Loading…"}
        </p>
        {!importOpen && (
          <Button variant="secondary" size="md" onClick={() => setImportOpen(true)}>
            <LuUpload className="mr-2 h-4 w-4" aria-hidden />
            Import
          </Button>
        )}
      </div>

      {importOpen && <ImportPanel onClose={() => setImportOpen(false)} />}

      <div className="mb-6 grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
        <form onSubmit={handleSearch} className="col-span-2 sm:min-w-[200px] sm:max-w-sm sm:flex-1">
          <label htmlFor="coverage-search" className="sr-only">
            Search coverage questions
          </label>
          <div className="relative">
            <LuSearch
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id="coverage-search"
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search questions..."
              className={cn(FIELD_CLS, "pl-9")}
            />
          </div>
        </form>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="coverage-exam" className={LABEL_CLS}>
            Exam
          </label>
          <select
            id="coverage-exam"
            value={examFilter}
            onChange={(e) => {
              setExamFilter(e.target.value);
              setPage(1);
            }}
            className={FIELD_CLS}
          >
            <option value="">All exams</option>
            <option value="WAEC">WAEC</option>
            <option value="JAMB">JAMB</option>
            <option value="NECO">NECO</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="coverage-subject" className={LABEL_CLS}>
            Subject
          </label>
          <select
            id="coverage-subject"
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setPage(1);
            }}
            className={FIELD_CLS}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="coverage-year" className={LABEL_CLS}>
            Year
          </label>
          <input
            id="coverage-year"
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value.replace(/\D/g, ""));
              setPage(1);
            }}
            placeholder="e.g. 2012"
            className={cn(FIELD_CLS, "sm:w-28")}
          />
        </div>

        {hasFilters ? (
          <Button variant="outline" size="md" onClick={handleClear} className="w-full sm:w-auto">
            Clear
          </Button>
        ) : null}
      </div>

      <div role="region" aria-label="Coverage questions" aria-busy={loading}>
        {error ? (
          <StatusBanner
            tone="error"
            title="Could not load coverage questions"
            message={error}
            action={
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : loading ? (
          <div className="flex items-center justify-center py-20" role="status" aria-label="Loading">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <LuCircleAlert className="mx-auto mb-3 h-10 w-10 text-muted" aria-hidden />
            <p className="text-muted">
              {hasFilters
                ? "No questions match these filters."
                : "No coverage questions yet. Use Import to add some."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-strong bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Coverage questions, page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
                </caption>
                <thead>
                  <tr className="border-b border-border-strong bg-secondary/50">
                    <th scope="col" className={cn(TH_CLS, "w-14 px-3 py-3 text-left sm:px-4")}>
                      No.
                    </th>
                    <th scope="col" className={cn(TH_CLS, "px-3 py-3 text-left sm:px-4")}>
                      Question
                    </th>
                    <th scope="col" className={cn(TH_CLS, HIDE_BELOW.md, "w-24 px-4 py-3 text-left")}>
                      Subject
                    </th>
                    <th scope="col" className={cn(TH_CLS, HIDE_BELOW.md, "w-20 px-4 py-3 text-left")}>
                      Exam
                    </th>
                    <th scope="col" className={cn(TH_CLS, HIDE_BELOW.lg, "w-20 px-4 py-3 text-left")}>
                      Year
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-strong">
                  {questions.map((q) => (
                    <tr key={q.id} className="hover:bg-secondary/30">
                      <td className="px-3 py-3 align-top tabular-nums text-muted sm:px-4">
                        {q.questionNumber ?? "—"}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <p className="line-clamp-2 break-words text-foreground">
                          <RichText text={q.questionText} />
                        </p>
                        {q.topic && <p className="mt-0.5 text-xs text-muted">{q.topic.title}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted lg:hidden">
                          <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary">
                            {q.subject.code}
                          </span>
                          <span>{q.examType}</span>
                          {q.examYear ? <span className="tabular-nums">{q.examYear}</span> : null}
                        </div>
                      </td>
                      <td className={cn(HIDE_BELOW.md, "px-4 py-3")}>
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {q.subject.code}
                        </span>
                      </td>
                      <td className={cn(HIDE_BELOW.md, "px-4 py-3 text-foreground")}>{q.examType}</td>
                      <td className={cn(HIDE_BELOW.lg, "px-4 py-3 tabular-nums text-foreground")}>
                        {q.examYear || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            Page <span className="tabular-nums">{pagination.page}</span> of{" "}
            <span className="tabular-nums">{pagination.totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
            >
              <LuChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
            >
              <LuChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
