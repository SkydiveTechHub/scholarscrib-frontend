"use client";

import { useMemo, useState } from "react";
import { LuCheck, LuInbox, LuPencil } from "react-icons/lu";
import { COVERAGE_EXAMS } from "@/lib/subject-coverage";
import { assessBoards } from "@/lib/board-availability";
import { isRelevantSubject } from "@/lib/subjects";
import type { PastPaper } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { usePastPapers } from "@/hooks/api/use-assessments";
import { PastPaperExam, type PastPaperSubject } from "./past-paper-exam";

const EXAM_BADGES: Record<string, "blue" | "green" | "purple" | "neutral"> = {
  jamb: "green",
  waec: "blue",
  neco: "purple",
};

// Stable empty list, so the memos below don't recompute every render.
const NO_PAPERS: PastPaper[] = [];

export function PastQuestionPicker({ track }: { track: string | null }) {
  // One fetch for the whole picker — the paper list is small (one row per
  // exam/subject/year), so every step filters in memory instead of re-querying.
  const pastPapers = usePastPapers<PastPaper>();
  const papers = pastPapers.data?.papers ?? NO_PAPERS;
  const loading = pastPapers.isPending;
  const failed = pastPapers.isError;

  const [exam, setExam] = useState<string | null>(null);
  const [subjectSlug, setSubjectSlug] = useState<string | null>(null);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [year, setYear] = useState<number | null>(null);

  // ① Which of those exams are open, decided from the papers themselves rather
  // than a hard-coded list. The unit is papers per subject, not questions: a
  // paper we have never pulled is fetched on the way into the quiz, so it
  // counts as coverage the moment the provider lists it.
  const boardStatus = useMemo(() => {
    const perBoard = new Map<string, Map<string, number>>();
    for (const p of papers) {
      const subjects = perBoard.get(p.examType) ?? new Map<string, number>();
      subjects.set(p.subjectId, (subjects.get(p.subjectId) ?? 0) + 1);
      perBoard.set(p.examType, subjects);
    }
    return assessBoards(
      "PAST_QUESTIONS",
      Object.fromEntries(
        [...perBoard.entries()].map(([board, subjects]) => [
          board,
          [...subjects.values()],
        ]),
      ),
    );
  }, [papers]);

  function chooseExam(key: string) {
    setExam(key);
    setSubjectSlug(null);
    setShowAllSubjects(false);
  }

  // ② Subjects offered for the chosen exam, with the years each holds a paper
  // for. Exam keys are lower-case here and upper-case on the papers.
  const subjects = useMemo<PastPaperSubject[]>(() => {
    if (!exam) return [];
    const bySlug = new Map<string, PastPaperSubject>();
    for (const p of papers) {
      if (p.examType.toLowerCase() !== exam) continue;
      const entry = bySlug.get(p.subjectSlug) ?? {
        slug: p.subjectSlug,
        name: p.subjectName,
        trackCategory: p.trackCategory,
        years: [],
      };
      if (!entry.years.includes(p.examYear)) entry.years.push(p.examYear);
      bySlug.set(p.subjectSlug, entry);
    }
    return [...bySlug.values()]
      .map((s) => ({ ...s, years: [...s.years].sort((a, b) => b - a) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [papers, exam]);

  const trackSubjects = useMemo(
    () => subjects.filter((s) => isRelevantSubject(s.trackCategory, track)),
    [subjects, track],
  );

  // Only offer the toggle when narrowing actually hides something.
  const narrows = trackSubjects.length < subjects.length;
  const visibleSubjects = showAllSubjects || !narrows ? subjects : trackSubjects;

  const chosenSubject = subjects.find((s) => s.slug === subjectSlug);
  const examLabel = COVERAGE_EXAMS.find((e) => e.key === exam)?.label ?? exam;

  // ③ Years a paper is on offer for, for the chosen subject.
  const years = chosenSubject?.years ?? [];

  // ④ The paper itself, sat in place of the picker. Leaving it lands back on
  // the year step with exam and subject still chosen.
  if (exam && chosenSubject && year !== null) {
    return (
      <PastPaperExam
        key={`${exam}:${chosenSubject.slug}:${year}`}
        exam={exam}
        examLabel={examLabel ?? exam}
        subject={chosenSubject}
        year={year}
        onExit={() => setYear(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ① Exam */}
      {exam ? (
        <SummaryChip
          step={1}
          label="Exam"
          value={examLabel ?? ""}
          onEdit={() => {
            setExam(null);
            setSubjectSlug(null);
          }}
        />
      ) : (
        <Step number={1} title="Choose an exam">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COVERAGE_EXAMS.map(({ key, label }) => {
              // Only judged once the papers are in: until then, don't lock
              // anything. A board with no papers at all is not open.
              const status = boardStatus[key.toUpperCase()];
              const closed = !loading && !failed && !status?.ready;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseExam(key)}
                  disabled={closed}
                  className="card card-interactive p-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Badge variant={EXAM_BADGES[key] ?? "neutral"}>{label}</Badge>
                  {closed && (
                    <p className="mt-2 text-xs text-muted">
                      {status?.reason ?? `No ${label} papers yet`}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </Step>
      )}

      {/* ② Subject */}
      {exam &&
        (chosenSubject ? (
          <SummaryChip
            step={2}
            label="Subject"
            value={chosenSubject.name}
            onEdit={() => setSubjectSlug(null)}
          />
        ) : (
          <Step
            number={2}
            title="Choose a subject"
            action={
              narrows ? (
                <button
                  type="button"
                  onClick={() => setShowAllSubjects((v) => !v)}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {showAllSubjects ? "Show my subjects" : "Show all subjects"}
                </button>
              ) : undefined
            }
          >
            {loading ? (
              <Spinner label="Loading subjects..." />
            ) : failed ? (
              <EmptyState
                tone="primary"
                icon={<LuInbox className="h-6 w-6" />}
                title="Couldn't load subjects"
                description="Please try again."
                action={
                  <button
                    type="button"
                    onClick={() => void pastPapers.refetch()}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Retry
                  </button>
                }
              />
            ) : visibleSubjects.length === 0 ? (
              <p className="text-sm text-muted">
                No {examLabel} subjects available yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleSubjects.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => setSubjectSlug(s.slug)}
                    className="card card-interactive p-4 text-left"
                  >
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {s.years.length} {s.years.length === 1 ? "paper" : "papers"}{" "}
                      &middot;{" "}
                      {s.years[0] === s.years[s.years.length - 1]
                        ? s.years[0]
                        : `${s.years[s.years.length - 1]}–${s.years[0]}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Step>
        ))}

      {/* ③ Year */}
      {exam && chosenSubject && (
        <Step number={3} title="Choose a year">
          {years.length === 0 ? (
            <p className="text-sm text-muted">No years listed for this subject.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className="rounded-xl border border-border bg-card px-3 py-2.5 text-center text-sm font-bold text-foreground transition-all hover:border-primary/40 hover:text-primary"
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </Step>
      )}
    </div>
  );
}

function Step({
  number,
  title,
  action,
  children,
}: {
  number: number;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card animate-slide-up p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-sm font-bold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {number}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SummaryChip({
  step,
  label,
  value,
  onEdit,
}: {
  step: number;
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-5 py-3.5 text-left shadow-soft transition-all hover:border-primary/30 hover:shadow-card"
    >
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
        <LuCheck className="h-4 w-4" />
      </span>
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="flex-1 truncate font-semibold text-foreground">{value}</span>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors group-hover:text-primary">
        <LuPencil className="h-3.5 w-3.5" />
        Change
      </span>
      <span className="sr-only">Change step {step}</span>
    </button>
  );
}
