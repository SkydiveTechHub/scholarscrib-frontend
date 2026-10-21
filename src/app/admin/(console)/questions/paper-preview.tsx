"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuChevronLeft, LuChevronRight, LuCircleAlert, LuX } from "react-icons/lu";
import { StatusBanner } from "@/components/admin/status-banner";
import { Button, buttonClass } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { useAdminQuestions } from "@/hooks/api/use-admin-questions";
import { listHref, optionEntries } from "@/lib/admin-coverage";
import type { AdminCoveragePaperOut, AdminCoverageSubjectOut } from "@/lib/api/types";
import { ExportButtons } from "./export-buttons";

interface PreviewQuestion {
  id: string;
  questionNumber: number | null;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  difficulty: string;
}

interface PreviewPagination {
  page: number;
  totalPages: number;
  total: number;
}

const PAGE_SIZE = "20";

/** Side panel previewing one paper's questions, in paper order. Mount it with a `key` per paper. */
export function PaperPreview({
  subject,
  paper,
  onClose,
  onError,
}: {
  subject: AdminCoverageSubjectOut;
  paper: AdminCoveragePaperOut;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [page, setPage] = useState(1);
  // The tab behind the overlay also gets the message, but this one is visible.
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const query = useAdminQuestions({
    page: String(page),
    pageSize: PAGE_SIZE,
    subjectId: subject.subjectId,
    examType: paper.examType,
    examYear: String(paper.examYear),
  });

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const questions = (query.data?.questions ?? []) as unknown as PreviewQuestion[];
  const pagination = (query.data?.pagination ?? null) as unknown as PreviewPagination | null;
  const loading = query.isPending || query.isPlaceholderData;
  const title = `${subject.name} · ${paper.examType} ${paper.examYear}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${title}`}
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-border-strong bg-card shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border-strong p-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted">
              <span className="tabular-nums">{paper.count}</span> questions
            </p>
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close preview"
          >
            <LuX className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-strong px-4 py-3">
          <ExportButtons
            subjectId={subject.subjectId}
            examType={paper.examType}
            examYear={paper.examYear}
            onError={(message) => {
              setDownloadError(message);
              onError(message);
            }}
          />
          <Link
            href={listHref({
              subjectId: subject.subjectId,
              examType: paper.examType,
              examYear: paper.examYear,
            })}
            className={buttonClass("ghost", "sm")}
          >
            Open in list
          </Link>
        </div>

        {downloadError && (
          <StatusBanner
            tone="error"
            title="Download failed"
            message={downloadError}
            className="mx-4 mt-4"
          />
        )}

        <div className="flex-1 overflow-y-auto p-4" aria-busy={loading}>
          {query.isError ? (
            <StatusBanner
              tone="error"
              title="Could not load this paper"
              action={
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center">
              <LuCircleAlert className="mx-auto mb-3 h-10 w-10 text-muted" aria-hidden />
              <p className="text-muted">No questions found for this paper.</p>
            </div>
          ) : (
            <ol className="space-y-5">
              {questions.map((question, index) => (
                <li key={question.id} className="text-sm">
                  <div className="flex gap-2">
                    <span className="w-7 shrink-0 text-right tabular-nums text-muted">
                      {question.questionNumber ?? (page - 1) * Number(PAGE_SIZE) + index + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-foreground">
                        <RichText text={question.questionText} />
                      </div>
                      <ul className="mt-2 space-y-1">
                        {optionEntries(question.options).map(([key, text]) => (
                          <li
                            key={key}
                            className={
                              key.toUpperCase() === String(question.correctAnswer).toUpperCase()
                                ? "font-medium text-tone-green-ink"
                                : "text-muted"
                            }
                          >
                            <span className="mr-1.5">{key}.</span>
                            <RichText text={text} />
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5 text-xs text-muted">
                        Answer: {question.correctAnswer} · {question.difficulty}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <nav
            aria-label="Preview pagination"
            className="flex items-center justify-between border-t border-border-strong px-4 py-3"
          >
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
      </aside>
    </div>
  );
}
