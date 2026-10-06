"use client";

import { useMemo, useRef, useState } from "react";
import { LuCheck, LuPencil, LuInbox } from "react-icons/lu";
import type { CoverageSubjectOut, CoverageSubjectsOut } from "@/lib/api/types";
import {
  COVERAGE_EXAMS,
  coverageYears,
  isTrackSubject,
  subjectsForExam,
} from "@/lib/subject-coverage";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { fetchApi } from "@/lib/api/client";
import { PastPaperExam } from "@/components/practice/past-paper-exam";

const EXAM_BADGES: Record<string, "blue" | "green" | "purple" | "neutral"> = {
  jamb: "green",
  waec: "blue",
  neco: "purple",
};

export function PastQuestionPicker({ track }: { track: string | null }) {
  // Coverage is fetched once, on the first exam pick, and filtered in memory
  // for every exam after that — one response lists every exam's subjects.
  const [coverage, setCoverage] = useState<CoverageSubjectOut[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const requested = useRef(false);

  const [exam, setExam] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string | null>(null);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [year, setYear] = useState<number | null>(null);

  function loadCoverage() {
    if (requested.current) return;
    requested.current = true;
    setLoading(true);
    setFailed(false);
    fetchApi<CoverageSubjectsOut>("/api/questions/coverage/subjects")
      .then((res) => setCoverage(res.data ?? []))
      .catch(() => {
        // Let the next click try again.
        requested.current = false;
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }

  function chooseExam(key: string) {
    setExam(key);
    setSubjectName(null);
    setShowAllSubjects(false);
    loadCoverage();
  }

  // ② Subjects offered for the chosen exam.
  const subjects = useMemo(
    () => (exam && coverage ? subjectsForExam(coverage, exam) : []),
    [coverage, exam],
  );

  const trackSubjects = useMemo(
    () => subjects.filter((s) => isTrackSubject(s, track)),
    [subjects, track],
  );

  // Only offer the toggle when narrowing actually hides something.
  const narrows = trackSubjects.length < subjects.length;
  const visibleSubjects = showAllSubjects || !narrows ? subjects : trackSubjects;

  const chosenSubject = subjects.find((s) => s.name === subjectName);
  const examLabel = COVERAGE_EXAMS.find((e) => e.key === exam)?.label ?? exam;

  // ③ Years the provider holds for the chosen subject.
  const years = useMemo(
    () => (chosenSubject ? coverageYears(chosenSubject) : []),
    [chosenSubject],
  );

  // ④ The paper itself, sat in place of the picker. Leaving it lands back on
  // the year step with exam and subject still chosen.
  if (exam && chosenSubject && year !== null) {
    return (
      <PastPaperExam
        key={`${exam}:${chosenSubject.name}:${year}`}
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
            setSubjectName(null);
          }}
        />
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
                    onClick={loadCoverage}
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
                    key={s.name}
                    type="button"
                    onClick={() => setSubjectName(s.name)}
                    className="card card-interactive p-4 text-left"
                  >
                    <p className="text-sm font-semibold text-foreground">{s.displayName}</p>
                    <p className="mt-1 text-xs text-muted">
                      {s.questionCount} questions &middot;{" "}
                      {s.yearRange.min === s.yearRange.max
                        ? s.yearRange.min
                        : `${s.yearRange.min}–${s.yearRange.max}`}
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
