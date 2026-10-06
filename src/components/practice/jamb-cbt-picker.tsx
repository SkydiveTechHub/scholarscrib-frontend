"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LuLock,
  LuCheck,
  LuTriangleAlert,
  LuArrowRight,
  LuInfo,
  LuRotateCcw,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JAMB_SPEC } from "@/lib/jamb-cbt";
import { examYearRange } from "@/lib/exam-years";
import {
  useGenerateJambCbt,
  usePrepareJambCbt,
} from "@/hooks/api/use-assessments";
import { Spinner } from "@/components/ui/spinner";
import { JAMB_SPEC, sharedYears } from "@/lib/jamb-cbt";
import { fetchApi } from "@/lib/api/client";
import type { JambPrepareOut } from "@/lib/api/types";
import { isTrackSubject } from "@/lib/subject-coverage";
import type { JambSubjectOption } from "@/lib/jamb-availability";

/** What picking a year did: still syncing, synced, or failed outright. */
type YearState =
  | { status: "idle" }
  | { status: "syncing" }
  | { status: "done"; report: JambPrepareOut }
  | { status: "error"; message: string };

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Network error. Please check your connection and try again.";
}

/**
 * The UTME sitting builder. English is fixed; the student adds three subjects
 * from the ones the question provider carries for JAMB (their track's first,
 * everything else a click away), then picks from the years all four share a
 * full paper for. Picking a year syncs its four papers into the bank, so
 * "ready" means the paper is really there to sit.
 */
export function JambCbtPicker({
  english,
  subjects,
  track,
}: {
  english: JambSubjectOption | null;
  subjects: JambSubjectOption[];
  track: string | null;
}) {
  const router = useRouter();
  const { mutateAsync: prepareJambCbt } = usePrepareJambCbt<Preparation>();
  const { mutateAsync: generateJambCbt } = useGenerateJambCbt();
  const [chosen, setChosen] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [yearState, setYearState] = useState<YearState>({ status: "idle" });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  // Only the newest year's sync may land: a student clicking through years
  // faster than the provider answers must not see an older year's report.
  const run = useRef(0);

  const trackSubjects = useMemo(
    () =>
      subjects.filter((s) =>
        isTrackSubject({ name: s.providerKey, category: s.category }, track),
      ),
    [subjects, track],
  );
  const narrows = trackSubjects.length > 0 && trackSubjects.length < subjects.length;
  // A chosen subject stays visible even when the list is narrowed again.
  const visible = useMemo(() => {
    if (showAll || !narrows) return subjects;
    return subjects.filter(
      (s) => trackSubjects.includes(s) || chosen.includes(s.id),
    );
  }, [showAll, narrows, subjects, trackSubjects, chosen]);

  const chosenSubjects = useMemo(
    () => subjects.filter((s) => chosen.includes(s.id)),
    [subjects, chosen],
  );
  const complete = chosen.length === JAMB_SPEC.otherSubjectCount;

  // A sitting is one year across all four papers.
  const years = useMemo(
    () => (english && complete ? sharedYears([english, ...chosenSubjects]) : []),
    [english, complete, chosenSubjects],
  );
  // When nothing is shared, name the subject with the fewest years: it is the
  // one most worth swapping.
  const narrowest = useMemo(
    () =>
      complete && years.length === 0
        ? [...chosenSubjects].sort((a, b) => a.years.length - b.years.length)[0]
        : null,
    [complete, years.length, chosenSubjects],
  );

  // Pull the four papers for the chosen year and report what the bank now
  // holds. Runs on selection so the wait and any shortfall land here, in front
  // of the year grid, rather than behind "Start exam".
  const prepare = useCallback(async (chosenYear: number, subjectIds: string[]) => {
    const run = ++prepRun.current;
    setPreparing(true);
    setPrep(null);
    setError("");
    try {
      const data = await prepareJambCbt({ subjectIds, examYear: chosenYear });
      if (run !== prepRun.current) return;
      setPrep({
        ready: data.ready,
        message: data.message ?? null,
        coverage: data.coverage ?? [],
      });
    } catch (error) {
      if (run === prepRun.current) {
        setError(
          error instanceof Error
            ? error.message
            : "Network error. Please check your connection and try again.",
        );
      }
    } finally {
      if (run === prepRun.current) setPreparing(false);
    }
  }, [prepareJambCbt]);

  /** Drops any selected year and the coverage report that went with it. */
  function clearYear() {
    prepRun.current++;
    setYear(null);
    setYearState({ status: "idle" });
    setStartError("");
  }

  function toggle(id: string) {
    setChosen((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= JAMB_SPEC.otherSubjectCount) return prev;
      return [...prev, id];
    });
    // The year was matched to the old combination.
    resetYear();
  }

  async function sync(chosenYear: number) {
    const mine = ++run.current;
    setYear(chosenYear);
    setYearState({ status: "syncing" });
    setStartError("");
    try {
      const report = await fetchApi<JambPrepareOut>(
        "/api/assessments/jamb-cbt/prepare",
        { method: "POST", body: { subjectIds: chosen, examYear: chosenYear } },
      );
      if (mine === run.current) setYearState({ status: "done", report });
    } catch (error) {
      if (mine === run.current) {
        setYearState({ status: "error", message: message(error) });
      }
    }
  }

  const ready = yearState.status === "done" && yearState.report.ready;

  async function start() {
    if (!year || !ready || !complete) return;
    setStarting(true);
    setStartError("");
    try {
      await generateJambCbt({ subjectIds: chosen, examYear: year });
      const params = new URLSearchParams({
        year: String(year),
        subjects: chosen.join(","),
      });
      router.push(`/practice/cbt/session?${params.toString()}`);
    } catch (error) {
      setStartError(message(error));
      setStarting(false);
    }
  }

  const remaining = JAMB_SPEC.otherSubjectCount - chosen.length;

  return (
    <div className="space-y-6">
      {/* Compulsory paper */}
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <LuLock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                {english?.name ?? "English Language"}
              </p>
              <p className="text-xs text-muted">
                Compulsory · {JAMB_SPEC.englishQuestions} questions
              </p>
            </div>
          </div>
          <Badge variant="blue">Added for you</Badge>
        </div>
      </section>

      {!english && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning"
        >
          <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">English Language papers aren&apos;t available.</p>
            <p className="mt-0.5 leading-relaxed">
              English is compulsory in JAMB, so no sitting can be assembled
              until its papers are back. Try again later.
            </p>
          </div>
        </div>
      )}

      {/* Subject choice */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-label">
            Choose {JAMB_SPEC.otherSubjectCount} more subjects
          </h2>
          <div className="flex items-center gap-3">
            {narrows && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {showAll
                  ? "Show my track's subjects"
                  : `Show all subjects (${subjects.length - trackSubjects.length} more)`}
              </button>
            )}
            <span className="text-xs font-semibold text-muted">
              {remaining > 0
                ? `${remaining} to go`
                : `${JAMB_SPEC.subjectCount} subjects selected`}
            </span>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted">No JAMB subjects are available yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {visible.map((subject) => {
              const selected = chosen.includes(subject.id);
              const full = !selected && complete;
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggle(subject.id)}
                  disabled={full || !english}
                  aria-pressed={selected}
                  className={cn(
                    "relative rounded-xl border p-3.5 text-left transition-all",
                    selected
                      ? "border-primary bg-primary-soft ring-4 ring-primary/15"
                      : "border-border bg-card hover:border-primary/40",
                    (full || !english) && "opacity-45",
                    !full && english && "cursor-pointer",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {subject.name}
                    </span>
                    {selected && (
                      <LuCheck className="h-4 w-4 flex-shrink-0 text-primary" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {subject.years.length === 0
                      ? "No full papers yet"
                      : `${subject.years.length} full paper${subject.years.length === 1 ? "" : "s"}`}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Year choice: only years all four subjects share a full paper for */}
      {complete && english && (
        <section className="animate-slide-up">
          <h2 className="section-label mb-1">Choose the year</h2>
          <p className="mb-3 text-xs text-muted">
            Years with a full paper in all four subjects.
          </p>

          {years.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning">
              <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="leading-relaxed">
                These four subjects don&apos;t share a full paper in any year.
                {narrowest && (
                  <>
                    {" "}
                    {narrowest.name} has the fewest (
                    {narrowest.years.length === 0
                      ? "none"
                      : narrowest.years.join(", ")}
                    ) — try swapping it.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => sync(y)}
                  aria-pressed={year === y}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors",
                    year === y
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/40",
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* What picking the year did. */}
          <div className="mt-3" aria-live="polite">
            {yearState.status === "syncing" && (
              <div className="space-y-1">
                <Spinner label={`Getting the ${year} papers ready…`} />
                <p className="text-xs text-muted">
                  The first time a year is used, its four papers are fetched
                  from the question bank. This can take up to a minute.
                </p>
              </div>
            )}

            {yearState.status === "done" && yearState.report.ready && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <LuCheck className="h-4 w-4" />
                The {year} paper is ready to sit.
              </p>
            )}

            {yearState.status === "done" && !yearState.report.ready && (
              <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning">
                <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    The {year} paper can&apos;t be sat in full.
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    Some questions in the bank were incomplete, so a subject is
                    short of its full paper. Pick another year.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {yearState.report.coverage.map((r) => (
                      <li
                        key={r.subjectId}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="truncate">{r.subjectName}</span>
                        <span className="flex-shrink-0 font-mono text-xs font-bold">
                          {Math.min(r.available, r.required)}/{r.required}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => year !== null && sync(year)}
                    className="mt-2.5 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
                  >
                    <LuRotateCcw className="h-3.5 w-3.5" />
                    Check {year} again
                  </button>
                </div>
              </div>
            )}

            {yearState.status === "error" && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">{yearState.message}</p>
                  <button
                    type="button"
                    onClick={() => year !== null && sync(year)}
                    className="mt-1.5 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
                  >
                    <LuRotateCcw className="h-3.5 w-3.5" />
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {startError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{startError}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <LuInfo className="h-3.5 w-3.5" />
          {JAMB_SPEC.totalQuestions} questions · {JAMB_SPEC.durationMinutes}{" "}
          minutes · marked out of {JAMB_SPEC.totalMarks}
        </p>
        <Button
          onClick={start}
          disabled={!ready || starting}
          size="lg"
        >
          {starting ? "Starting your exam…" : "Start exam"}
          {!starting && <LuArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
