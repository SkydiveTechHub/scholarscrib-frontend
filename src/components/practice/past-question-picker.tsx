"use client";

import { useMemo, useState } from "react";
import { LuCheck, LuInbox, LuPencil } from "react-icons/lu";
import {
  COVERAGE_EXAMS,
  isTrackSubject,
  subjectsForExam,
  yearsForExam,
} from "@/lib/subject-coverage";
import type { CoverageSubjectOut } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useCoverageSubjects, useCoverageSubjectYears } from "@/hooks/api/use-assessments";
import { PastPaperExam } from "./past-paper-exam";

const EXAM_BADGES: Record<string, "blue" | "green" | "purple" | "neutral"> = {
  jamb: "green",
  waec: "blue",
  neco: "purple",
};

// Stable empty list, so the memos below don't recompute every render.
const NO_SUBJECTS: CoverageSubjectOut[] = [];

/**
 * Past questions, one subject at a time, straight from the question provider:
 * ① exam → ② the provider's subjects for that exam, narrowed to the student's
 * track → ③ the years the provider holds for that subject under that exam →
 * ④ the paper, fetched from the provider and sat as a recorded attempt.
 */
export function PastQuestionPicker({ track }: { track: string | null }) {
  const coverage = useCoverageSubjects();
  const allSubjects = coverage.data?.data ?? NO_SUBJECTS;

  const [exam, setExam] = useState<string | null>(null);
  // The provider's subject key, e.g. "english-language".
  const [subjectName, setSubjectName] = useState<string | null>(null);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [year, setYear] = useState<number | null>(null);

  const yearsQuery = useCoverageSubjectYears(subjectName);

  function chooseExam(key: string | null) {
    setExam(key);
    setSubjectName(null);
    setShowAllSubjects(false);
    setYear(null);
  }

  // ② Subjects the provider holds under the chosen exam.
  const subjects = useMemo(
    () => (exam ? subjectsForExam(allSubjects, exam) : []),
    [allSubjects, exam],
  );

  const trackSubjects = useMemo(
    () => subjects.filter((s) => isTrackSubject(s, track)),
    [subjects, track],
  );

  // Only offer the toggle when narrowing actually hides something.
  const narrows = trackSubjects.length < subjects.length;
  const visibleSubjects = showAllSubjects || !narrows ? subjects : trackSubjects;

  const chosenSubject = subjects.find((s) => s.name === subjectName) ?? null;
  const examLabel = COVERAGE_EXAMS.find((e) => e.key === exam)?.label ?? exam ?? "";

  // ③ Years the provider holds for that subject under that exam.
  const years = useMemo(
    () => (exam && yearsQuery.data ? yearsForExam(yearsQuery.data.data, exam) : []),
    [yearsQuery.data, exam],
  );

  // ④ The paper itself, sat in place of the picker. Leaving it lands back on
  // the year step with exam and subject still chosen. The past-paper
  // endpoints take the provider's subject key.
  if (exam && chosenSubject && year !== null) {
    return (
      <PastPaperExam
        key={`${exam}:${chosenSubject.name}:${year}`}
        exam={exam}
        examLabel={examLabel}
        subject={{
          slug: chosenSubject.name,
          name: chosenSubject.displayName,
          trackCategory: chosenSubject.category,
          years: years.map((y) => y.year),
        }}
        year={year}
        onExit={() => setYear(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ① Exam */}
      {exam ? (
        <SummaryChip step={1} label="Exam" value={examLabel} onEdit={() => chooseExam(null)} />
      ) : (
        <Step number={1} title="Choose an exam">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COVERAGE_EXAMS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => chooseExam(key)}
                className="card card-interactive p-4 text-left"
              >
                <Badge variant={EXAM_BADGES[key] ?? "neutral"}>{label}</Badge>
              </button>
            ))}
          </div>
        </Step>
      )}

      {/* ② Subject */}
      {exam &&
        (chosenSubject ? (
          <SummaryChip
            step={2}
            label="Subject"
            value={chosenSubject.displayName}
            onEdit={() => setSubjectName(null)}
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
            {coverage.isPending ? (
              <Spinner label="Loading subjects..." />
            ) : coverage.isError ? (
              <RetryState title="Couldn't load subjects" onRetry={() => void coverage.refetch()} />
            ) : visibleSubjects.length === 0 ? (
              <p className="text-sm text-muted">No {examLabel} subjects available yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleSubjects.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setSubjectName(s.name)}
                    className="card card-interactive p-4 text-left"
                  >
                    <p className="text-sm font-semibold text-foreground">{s.displayName}</p>
                  </button>
                ))}
              </div>
            )}
          </Step>
        ))}

      {/* ③ Year */}
      {exam && chosenSubject && (
        <Step number={3} title="Choose a year">
          {yearsQuery.isPending ? (
            <Spinner label="Loading years..." />
          ) : yearsQuery.isError ? (
            <RetryState title="Couldn't load years" onRetry={() => void yearsQuery.refetch()} />
          ) : years.length === 0 ? (
            <p className="text-sm text-muted">
              No {examLabel} {chosenSubject.displayName} papers available yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {years.map((y) => (
                <button
                  key={y.year}
                  type="button"
                  onClick={() => setYear(y.year)}
                  className="group rounded-xl border border-border bg-card px-3 py-2.5 text-center transition-all hover:border-primary/40"
                >
                  <span className="block text-sm font-bold text-foreground group-hover:text-primary">
                    {y.year}
                  </span>
                  <span className="block text-xs text-muted">{y.questionCount} questions</span>
                </button>
              ))}
            </div>
          )}
        </Step>
      )}
    </div>
  );
}

function RetryState({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <EmptyState
      tone="primary"
      icon={<LuInbox className="h-6 w-6" />}
      title={title}
      description="Please try again."
      action={
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Retry
        </button>
      }
    />
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
