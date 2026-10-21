"use client";

import { useCallback, useState } from "react";
import { LuCircleAlert } from "react-icons/lu";
import { StatusBanner } from "@/components/admin/status-banner";
import { Button } from "@/components/ui/button";
import { useQuestionCoverage } from "@/hooks/api/use-admin-questions";
import { fillBadge, paperKey } from "@/lib/admin-coverage";
import type { AdminCoveragePaperOut, AdminCoverageSubjectOut } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ExportButtons } from "./export-buttons";
import { PaperPreview } from "./paper-preview";

export function CoverageTab() {
  const coverage = useQuestionCoverage();
  const [selected, setSelected] = useState<{
    subject: AdminCoverageSubjectOut;
    paper: AdminCoveragePaperOut;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const closePreview = useCallback(() => setSelected(null), []);

  const subjects = coverage.data?.subjects ?? [];

  if (coverage.isError) {
    return (
      <StatusBanner
        tone="error"
        title="Could not load coverage"
        message={
          coverage.error instanceof Error
            ? coverage.error.message
            : "Could not reach the server. Check your connection and retry."
        }
        action={
          <Button variant="outline" size="sm" onClick={() => void coverage.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (coverage.isPending) {
    return (
      <div
        className="flex items-center justify-center py-20"
        role="status"
        aria-label="Loading coverage"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {downloadError && (
        <StatusBanner
          tone="error"
          title="Download failed"
          message={downloadError}
          className="mb-4"
        />
      )}

      {subjects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <LuCircleAlert className="mx-auto mb-3 h-10 w-10 text-muted" aria-hidden />
          <p className="text-muted">No past-paper questions have been populated yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {subjects.map((subject) => (
            <li
              key={subject.subjectId}
              className="rounded-lg border border-border-strong bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{subject.name}</h2>
                  <p className="text-sm text-muted">
                    <span className="tabular-nums">{subject.total}</span> questions across{" "}
                    <span className="tabular-nums">{subject.papers.length}</span> papers
                  </p>
                </div>
                <ExportButtons
                  subjectId={subject.subjectId}
                  allYears
                  onError={setDownloadError}
                />
              </div>

              <ul className="mt-3 flex flex-wrap gap-2">
                {subject.papers.map((paper) => {
                  const badge = fillBadge(paper.fetchStatus);
                  return (
                    <li key={paperKey(subject.subjectId, paper.examType, paper.examYear)}>
                      <button
                        type="button"
                        onClick={() => {
                          setDownloadError(null);
                          setSelected({ subject, paper });
                        }}
                        aria-label={`Preview ${subject.name} ${paper.examType} ${paper.examYear}, ${paper.count} questions`}
                        className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      >
                        <span className="font-medium text-foreground">
                          {paper.examType} {paper.examYear}
                        </span>
                        <span className="tabular-nums text-muted">{paper.count}</span>
                        {badge && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[11px] font-medium",
                              badge.tone === "amber"
                                ? "bg-tone-amber-soft text-tone-amber-ink"
                                : "bg-tone-red-soft text-tone-red-ink",
                            )}
                          >
                            {badge.label}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <PaperPreview
          key={paperKey(
            selected.subject.subjectId,
            selected.paper.examType,
            selected.paper.examYear,
          )}
          subject={selected.subject}
          paper={selected.paper}
          onClose={closePreview}
          onError={setDownloadError}
        />
      )}
    </div>
  );
}
