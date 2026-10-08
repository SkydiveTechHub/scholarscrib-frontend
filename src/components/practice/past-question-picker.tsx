"use client";

import { useMemo, useState } from "react";
import { LuCheck, LuInbox, LuPencil, LuTrendingDown, LuTrendingUp } from "react-icons/lu";
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
import {
  useCoverageSubjects,
  useCoverageSubjectYears,
  usePastPaperHistory,
} from "@/hooks/api/use-assessments";
import { formatScore, summariseHistory } from "@/lib/past-paper-history";
import { PastPaperExam } from "./past-paper-exam";
import { PastPaperHistoryModal } from "./past-paper-history-modal";

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
export function PastQuestionPicker({
  track,
  initialExam = null,
  initialSubject = null,
}: {
  track: string | null;
  /** Deep link: start with this exam chosen (case-insensitive). */
  initialExam?: string | null;
  /** Deep link: start with this subject chosen, by provider key or our slug. */
  initialSubject?: string | null;
}) {
  const coverage = useCoverageSubjects();
  const allSubjects = coverage.data?.data ?? NO_SUBJECTS;

  const [exam, setExam] = useState<string | null>(() => {
    const key = initialExam?.toLowerCase();
    return COVERAGE_EXAMS.some((e) => e.key === key) ? (key as string) : null;
  });
  // The provider's subject key, e.g. "english-language".
  const [subjectName, setSubjectName] = useState<string | null>(
    initialExam && initialSubject ? initialSubject : null,
  );
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [year, setYear] = useState<number | null>(null);

  // A year whose earlier sittings are being reviewed in the modal.
  const [reviewYear, setReviewYear] = useState<number | null>(null);

  // ② Subjects the provider holds under the chosen exam.
  const subjects = useMemo(
    () => (exam ? subjectsForExam(allSubjects, exam) : []),
    [allSubjects, exam],
  );

  // Our slugs don't always match the provider's keys (e.g. "english" vs
  // "english-language"), so a deep-linked slug is matched against the key,
  // the display name, or as a prefix of either.
  const chosenSubject = useMemo(
    () => (subjectName ? findSubject(subjects, subjectName) : null),
    [subjects, subjectName],
  );

  // A deep-linked subject the provider doesn't hold under this exam (e.g.
  // Chemistry is JAMB-only): say so, and offer the exams that do have it.
  const unavailable = useMemo(() => {
    if (!subjectName || chosenSubject || !exam || !coverage.data) return null;
    const subject = findSubject(allSubjects, subjectName);
    if (!subject) return null;
    const otherExams = COVERAGE_EXAMS.filter(
      (e) => e.key !== exam && subject.examTypes.includes(e.key),
    );
    return { subject, otherExams };
  }, [subjectName, chosenSubject, exam, coverage.data, allSubjects]);

  const yearsQuery = useCoverageSubjectYears(chosenSubject?.name ?? null);
  const historyQuery = usePastPaperHistory(exam, chosenSubject?.name ?? null);
  const history = useMemo(() => summariseHistory(historyQuery.data), [historyQuery.data]);

  function chooseExam(key: string | null) {
    setExam(key);
    setSubjectName(null);
    setShowAllSubjects(false);
    setYear(null);
    setReviewYear(null);
  }

  const trackSubjects = useMemo(
    () => subjects.filter((s) => isTrackSubject(s, track)),
    [subjects, track],
  );

  // Only offer the toggle when narrowing actually hides something.
  const narrows = trackSubjects.length < subjects.length;
  const visibleSubjects = showAllSubjects || !narrows ? subjects : trackSubjects;

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
        onExit={() => {
          setYear(null);
          void historyQuery.refetch();
        }}
      />
    );
  }

  const reviewSummary = reviewYear !== null ? history.get(reviewYear) : undefined;

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
              narrows && !unavailable ? (
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
            {unavailable && (
              <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
                <p className="text-foreground">
                  {unavailable.subject.displayName} isn&apos;t available for {examLabel} yet.
                </p>
                {unavailable.otherExams.length > 0 && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
                    Practise it under:
                    {unavailable.otherExams.map((e) => (
                      <button
                        key={e.key}
                        type="button"
                        onClick={() => {
                          setExam(e.key);
                          setYear(null);
                        }}
                        className="font-semibold text-primary hover:underline"
                      >
                        {e.label}
                      </button>
                    ))}
                  </p>
                )}
              </div>
            )}
            {unavailable ? null : coverage.isPending ? (
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
              {years.map((y) => {
                const past = history.get(y.year);
                return (
                  <button
                    key={y.year}
                    type="button"
                    onClick={() => (past ? setReviewYear(y.year) : setYear(y.year))}
                    className="group rounded-xl border border-border bg-card px-3 py-2.5 text-center transition-all hover:border-primary/40"
                  >
                    <span className="block text-sm font-bold text-foreground group-hover:text-primary">
                      {y.year}
                    </span>
                    <span className="block text-xs text-muted">{y.questionCount} questions</span>
                    {past && (
                      <Badge variant="primary" className="mt-1.5 px-2 py-0.5 text-[11px]">
                        {past.count}× · best {formatScore(past, past.best ?? 0)}
                        {past.trend === "up" && <LuTrendingUp className="h-3 w-3 text-success" />}
                        {past.trend === "down" && <LuTrendingDown className="h-3 w-3 text-danger" />}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Step>
      )}

      {reviewYear !== null && reviewSummary && (
        <PastPaperHistoryModal
          title={`${examLabel} ${chosenSubject?.displayName ?? ""} ${reviewYear}`}
          summary={reviewSummary}
          onClose={() => setReviewYear(null)}
          onStart={() => {
            setYear(reviewYear);
            setReviewYear(null);
          }}
        />
      )}
    </div>
  );
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function findSubject(
  subjects: readonly CoverageSubjectOut[],
  slug: string,
): CoverageSubjectOut | null {
  const want = slugify(slug);
  return (
    subjects.find((s) => s.name === slug) ??
    subjects.find((s) => slugify(s.name) === want || slugify(s.displayName) === want) ??
    subjects.find((s) => slugify(s.name).startsWith(want) || want.startsWith(slugify(s.name))) ??
    null
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
