"use client";

import { useCallback, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { LuCheck, LuChevronDown, LuChevronRight, LuCircleAlert } from "react-icons/lu";
import { StatusBanner } from "@/components/admin/status-banner";
import { Button } from "@/components/ui/button";
import { fillBadge, groupPapersByExam, paperKey, type ExamGroup } from "@/lib/admin-coverage";
import type {
  AdminCoveragePaperOut,
  AdminCoverageSubjectOut,
  AdminQuestionCoverageOut,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ExportButtons } from "./export-buttons";
import { PaperPreview } from "./paper-preview";

function ExamGroupSection({
  subject,
  group,
  onSelect,
  showExport,
  inCoverage,
}: {
  subject: AdminCoverageSubjectOut;
  group: ExamGroup;
  onSelect: (paper: AdminCoveragePaperOut) => void;
  showExport: boolean;
  inCoverage?: ReadonlySet<string>;
}) {
  const [open, setOpen] = useState(true);
  const listId = `${subject.subjectId}-${group.examType}-papers`;

  return (
    <section
      aria-label={`${group.examType} papers`}
      className="rounded-lg border border-border bg-secondary/20 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={listId}
          className="flex items-center gap-1.5 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {open ? (
            <LuChevronDown className="h-4 w-4 text-muted" aria-hidden />
          ) : (
            <LuChevronRight className="h-4 w-4 text-muted" aria-hidden />
          )}
          <span className="text-sm font-semibold text-foreground">{group.examType}</span>
          <span className="text-sm text-muted">
            <span className="tabular-nums">{group.count}</span> questions ·{" "}
            <span className="tabular-nums">{group.papers.length}</span> papers
          </span>
        </button>
        {showExport && (
          <ExportButtons subjectId={subject.subjectId} examType={group.examType} allYears />
        )}
      </div>

      {open && (
        <ul id={listId} className="mt-2 flex flex-wrap gap-2">
          {group.papers.map((paper) => {
            const badge = fillBadge(paper.fetchStatus);
            const both = inCoverage?.has(paperKey(subject.subjectId, paper.examType, paper.examYear)) ?? false;
            return (
              <li key={paperKey(subject.subjectId, paper.examType, paper.examYear)}>
                <button
                  type="button"
                  onClick={() => onSelect(paper)}
                  aria-label={`Preview ${subject.name} ${paper.examType} ${paper.examYear}, ${paper.count} questions${both ? ", also in Coverage" : ""}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <span className="font-medium text-foreground">{paper.examYear}</span>
                  <span className="tabular-nums text-muted">{paper.count}</span>
                  {both && (
                    <LuCheck
                      className="h-3.5 w-3.5 text-tone-green-ink"
                      aria-label="Also in Coverage"
                      role="img"
                    />
                  )}
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
      )}
    </section>
  );
}

/**
 * The subject → exam → year board shared by Backfill and Coverage. Each tab
 * passes its own data and says which question table the preview reads.
 */
export function CoverageBoard({
  coverage,
  source,
  emptyMessage,
  showExport,
  inCoverage,
}: {
  coverage: UseQueryResult<AdminQuestionCoverageOut>;
  source: "bank" | "coverage";
  emptyMessage: string;
  showExport: boolean;
  /** Paper keys also present in the Coverage table; those pills get a check. */
  inCoverage?: ReadonlySet<string>;
}) {
  const [selected, setSelected] = useState<{
    subject: AdminCoverageSubjectOut;
    paper: AdminCoveragePaperOut;
  } | null>(null);
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
      {subjects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <LuCircleAlert className="mx-auto mb-3 h-10 w-10 text-muted" aria-hidden />
          <p className="text-muted">{emptyMessage}</p>
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
                {showExport && <ExportButtons subjectId={subject.subjectId} allYears />}
              </div>

              <div className="mt-3 space-y-3">
                {groupPapersByExam(subject.papers).map((group) => (
                  <ExamGroupSection
                    key={group.examType}
                    subject={subject}
                    group={group}
                    onSelect={(paper) => setSelected({ subject, paper })}
                    showExport={showExport}
                    inCoverage={inCoverage}
                  />
                ))}
              </div>
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
          source={source}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
