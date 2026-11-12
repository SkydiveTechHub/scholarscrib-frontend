"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuRefreshCw,
} from "react-icons/lu";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useCenterGroups,
  useCenterRoster,
} from "@/hooks/api/use-center";
import { useActiveCenter } from "@/hooks/use-active-center";
import {
  useCenterAssignment,
  useCreateAssignment,
  useGenerateAssignment,
  usePublishAssignment,
  useUpdateAssignment,
} from "@/hooks/api/use-center-assignments";
import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { request } from "@/lib/api/http";
import type {
  AssignmentEnvelopeOut,
  AssignmentOut,
  AssignmentQuestionPreviewOut,
  AssignmentRevealAnswers,
  AssignmentAttemptScoring,
  AssignmentTaskTypeCode,
  AssignmentTargetIn,
  GenerateAssignmentOut,
  UpdateAssignmentIn,
} from "@/lib/api/types";
import {
  ASSIGNMENT_DIFFICULTIES,
  ASSIGNMENT_EXAM_TYPES,
  P0_TASK_TYPES,
  REVEAL_OPTIONS,
  SCORING_OPTIONS,
  slugifySubject,
  taskTypeLabel,
} from "@/lib/center-assignments";
import { CENTER_SUBJECT_OPTIONS } from "@/lib/center-subjects";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "type", label: "Type" },
  { id: "filters", label: "Filters" },
  { id: "preview", label: "Preview" },
  { id: "targets", label: "Targets" },
  { id: "settings", label: "Settings" },
  { id: "publish", label: "Publish" },
] as const;

type StepId = (typeof STEPS)[number]["id"];
type TargetMode = "CENTER" | "GROUPS" | "STUDENTS";

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function memberName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ").trim() || "Student";
}

function membershipKey(m: { membershipId?: string; id?: string }) {
  return m.membershipId || m.id || "";
}

function errMessage(err: unknown, fallback: string) {
  return isApiError(err) ? err.message || fallback : fallback;
}

export function AssignmentCreateWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const draftId = search.get("draft");

  const { centersQuery, center, centerId: activeCenterId } = useActiveCenter();
  const centerId = activeCenterId ?? "";

  const draftQuery = useCenterAssignment(centerId || null, draftId);
  const create = useCreateAssignment(centerId);
  const rosterQuery = useCenterRoster(centerId || null);
  const groupsQuery = useCenterGroups(centerId || null);

  const [step, setStep] = useState<StepId>("type");
  const [assignment, setAssignment] = useState<AssignmentOut | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<
    AssignmentQuestionPreviewOut[]
  >([]);
  const [taskType, setTaskType] = useState<AssignmentTaskTypeCode>("TOPIC_QUIZ");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [examType, setExamType] = useState("WAEC");
  const [examYear, setExamYear] = useState(String(new Date().getFullYear() - 1));
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState(20);
  const [targetMode, setTargetMode] = useState<TargetMode>("CENTER");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [membershipIds, setMembershipIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);
  const [attemptScoring, setAttemptScoring] =
    useState<AssignmentAttemptScoring>("latest");
  const [revealAnswers, setRevealAnswers] =
    useState<AssignmentRevealAnswers>("after_due");
  const [allowLate, setAllowLate] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [hydrated, setHydrated] = useState(!draftId);

  const assignmentId = assignment?.id ?? "";
  const generateHook = useGenerateAssignment(centerId, assignmentId || "pending");
  const updateHook = useUpdateAssignment(centerId, assignmentId || "pending");
  const publishHook = usePublishAssignment(centerId, assignmentId || "pending");

  const subjectOptions = useMemo(() => {
    const fromCenter = (center?.subjects ?? []).filter(Boolean);
    return Array.from(new Set([...fromCenter, ...CENTER_SUBJECT_OPTIONS]));
  }, [center?.subjects]);

  useEffect(() => {
    if (!draftId || !draftQuery.data || hydrated) return;
    const a = draftQuery.data;
    setAssignment(a);
    setTaskType(a.taskType);
    setTitle(a.title ?? "");
    const filters = a.settings?.filters ?? {};
    setSubject(
      filters.subjectSlug ||
        center?.subjects?.[0] ||
        CENTER_SUBJECT_OPTIONS[0],
    );
    setTopicSlug(filters.topicSlug ?? "");
    setExamType((filters.examType ?? "WAEC").toUpperCase());
    setExamYear(
      filters.examYear != null
        ? String(filters.examYear)
        : String(new Date().getFullYear() - 1),
    );
    setDifficulty(filters.difficulty ?? "");
    setCount(filters.count ?? 20);
    setInstructions(a.settings?.instructions ?? "");
    setOpensAt(toDatetimeLocal(a.opensAt));
    setDueAt(toDatetimeLocal(a.dueAt));
    setTimeLimitMinutes(
      a.settings?.timeLimitMinutes != null
        ? String(a.settings.timeLimitMinutes)
        : "",
    );
    setAttemptsAllowed(a.settings?.attemptsAllowed ?? 1);
    setAttemptScoring(a.settings?.attemptScoring ?? "latest");
    setRevealAnswers(a.settings?.revealAnswers ?? "after_due");
    setAllowLate((a.settings?.latePolicy ?? "accepted_flagged") !== "blocked");

    const targets = a.targets ?? [];
    if (targets.some((t) => (t.kind ?? "").toUpperCase() === "CENTER")) {
      setTargetMode("CENTER");
    } else if (targets.some((t) => (t.kind ?? "").toUpperCase() === "GROUP")) {
      setTargetMode("GROUPS");
      setGroupIds(
        targets
          .filter((t) => (t.kind ?? "").toUpperCase() === "GROUP" && t.targetId)
          .map((t) => t.targetId!),
      );
    } else if (targets.some((t) => (t.kind ?? "").toUpperCase() === "STUDENT")) {
      setTargetMode("STUDENTS");
      setMembershipIds(
        targets
          .filter(
            (t) => (t.kind ?? "").toUpperCase() === "STUDENT" && t.targetId,
          )
          .map((t) => t.targetId!),
      );
    }

    if (a.assessmentId) setStep("preview");
    else if (a.taskType === "LESSON" && filters.topicSlug) setStep("targets");
    else if (filters.subjectSlug) setStep("filters");
    else setStep("type");
    setHydrated(true);
  }, [draftId, draftQuery.data, hydrated, center?.subjects]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const needsQuestions = taskType !== "LESSON";

  function buildTargets(): AssignmentTargetIn[] {
    if (targetMode === "CENTER") return [{ kind: "CENTER" }];
    if (targetMode === "GROUPS") {
      return groupIds.map((id) => ({ kind: "GROUP", targetId: id }));
    }
    return membershipIds.map((id) => ({ kind: "STUDENT", targetId: id }));
  }

  function buildFilters() {
    const subjectSlug = slugifySubject(subject);
    const base = {
      subjectSlug,
      examType: examType || undefined,
      examYear: examYear ? Number(examYear) : undefined,
      difficulty: difficulty || undefined,
      count: needsQuestions ? count : undefined,
      topicSlug: topicSlug.trim() || undefined,
    };
    if (taskType === "MOCK_EXAM") {
      return {
        ...base,
        from: { classLevel: "SS1" as const, term: "FIRST" as const },
        to: { classLevel: "SS3" as const, term: "THIRD" as const },
      };
    }
    return base;
  }

  async function ensureDraft() {
    if (assignment) return assignment;
    if (!centerId) throw new Error("No center");
    const draftTitle = title.trim() || `${taskTypeLabel(taskType)} draft`;
    const created = await create.mutateAsync({
      taskType,
      title: draftTitle.length >= 2 ? draftTitle : "New assignment",
    });
    setAssignment(created);
    if (!title.trim()) setTitle(created.title);
    return created;
  }

  async function runGenerate(id: string, filters = buildFilters()) {
    if (assignmentId === id) {
      return generateHook.mutateAsync({ filters });
    }
    return request<GenerateAssignmentOut>({
      method: "POST",
      url: endpoints.centerApi.assignments.generate(centerId, id),
      data: { filters },
      realm: "tutor",
    });
  }

  async function runUpdate(id: string, body: UpdateAssignmentIn) {
    if (assignmentId === id) return updateHook.mutateAsync(body);
    const res = await request<AssignmentEnvelopeOut>({
      method: "PATCH",
      url: endpoints.centerApi.assignments.detail(centerId, id),
      data: body,
      realm: "tutor",
    });
    return res.assignment;
  }

  async function goFiltersNext() {
    setError("");
    if (!subject) {
      setError("Pick a subject.");
      return;
    }
    if (taskType === "LESSON" && !topicSlug.trim()) {
      setError("Enter the classroom topic slug students should open.");
      return;
    }
    if (taskType === "PAST_PAPER" && (!examType || !examYear)) {
      setError("Exam board and year are required for past papers.");
      return;
    }
    if (needsQuestions && (count < 5 || count > 80)) {
      setError("Question count must be between 5 and 80.");
      return;
    }

    setBusy(true);
    try {
      const draft = await ensureDraft();
      const nextTitle =
        title.trim() || `${taskTypeLabel(taskType)} — ${subject}`;
      const filters = buildFilters();
      await runUpdate(draft.id, {
        title: nextTitle,
        settings: {
          instructions: instructions || null,
          filters,
        },
        filters,
      });
      setTitle(nextTitle);
      if (needsQuestions) {
        const gen = await runGenerate(draft.id, filters);
        setAssignment(gen.assignment);
        setPreviewQuestions(gen.preview?.questions ?? []);
        setStep("preview");
      } else {
        setAssignment(
          await runUpdate(draft.id, {
            title: nextTitle,
            settings: { filters },
            filters,
          }),
        );
        setStep("targets");
      }
    } catch (err) {
      setError(errMessage(err, "Could not build the assignment content."));
    } finally {
      setBusy(false);
    }
  }

  async function onRegenerate() {
    if (!assignmentId) return;
    setError("");
    setRegenBusy(true);
    try {
      const gen = await runGenerate(assignmentId, buildFilters());
      setAssignment(gen.assignment);
      setPreviewQuestions(gen.preview?.questions ?? []);
    } catch (err) {
      setError(errMessage(err, "Could not regenerate questions."));
    } finally {
      setRegenBusy(false);
    }
  }

  function settingsBody(): UpdateAssignmentIn {
    const filters = buildFilters();
    return {
      title: title.trim(),
      instructions: instructions.trim() || null,
      opensAt: fromDatetimeLocal(opensAt),
      dueAt: fromDatetimeLocal(dueAt),
      targets: buildTargets(),
      filters,
      settings: {
        instructions: instructions.trim() || null,
        timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
        attemptsAllowed,
        attemptScoring,
        revealAnswers,
        latePolicy: allowLate ? "accepted_flagged" : "blocked",
        filters,
      },
    };
  }

  async function saveThen(next: StepId) {
    setError("");
    if (buildTargets().length === 0) {
      setError("Pick at least one target.");
      return;
    }
    if (next === "publish" && title.trim().length < 2) {
      setError("Title must be at least 2 characters.");
      return;
    }
    setBusy(true);
    try {
      const draft = await ensureDraft();
      setAssignment(await runUpdate(draft.id, settingsBody()));
      setStep(next);
    } catch (err) {
      setError(errMessage(err, "Could not save assignment settings."));
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    setError("");
    if (title.trim().length < 2) {
      setError("Title must be at least 2 characters.");
      return;
    }
    if (buildTargets().length === 0) {
      setError("Pick at least one target.");
      return;
    }
    setBusy(true);
    try {
      const draft = await ensureDraft();
      await runUpdate(draft.id, settingsBody());
      if (assignmentId === draft.id) {
        await publishHook.mutateAsync();
      } else {
        await request<AssignmentEnvelopeOut>({
          method: "POST",
          url: endpoints.centerApi.assignments.publish(centerId, draft.id),
          data: {},
          realm: "tutor",
        });
      }
      router.push("/center/assignments");
      router.refresh();
    } catch (err) {
      setError(errMessage(err, "Could not publish."));
    } finally {
      setBusy(false);
    }
  }

  if (centersQuery.isLoading || (draftId && !hydrated && draftQuery.isLoading)) {
    return <Spinner label="Loading wizard…" />;
  }

  if (!center) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted">Create a center before assigning work.</p>
        <Link href="/center/onboarding" className={buttonClass("primary", "md")}>
          Set up center
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ol className="flex gap-1.5" aria-label="Wizard steps">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= stepIndex ? "bg-primary" : "bg-border",
            )}
            title={s.label}
          />
        ))}
      </ol>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex]?.label}
      </p>

      {error && (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      {step === "type" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">What are you assigning?</h2>
            <p className="mt-1 text-sm text-muted">
              Choose a P0 task type. Flashcards arrive in a later milestone.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {P0_TASK_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTaskType(t.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  taskType === t.id
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <p className="text-sm font-bold text-foreground">{t.title}</p>
                <p className="mt-1 text-xs text-muted">{t.description}</p>
              </button>
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              placeholder="e.g. SS2 Algebra warm-up"
            />
          </label>
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={busy}
              onClick={async () => {
                setError("");
                setBusy(true);
                try {
                  if (!assignment) {
                    const draftTitle =
                      title.trim().length >= 2
                        ? title.trim()
                        : `${taskTypeLabel(taskType)} draft`;
                    const created = await create.mutateAsync({
                      taskType,
                      title: draftTitle,
                    });
                    setAssignment(created);
                    setTitle(created.title);
                  }
                  setStep("filters");
                } catch (err) {
                  setError(errMessage(err, "Could not start draft."));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Continue <LuArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === "filters" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Filters</h2>
            <p className="mt-1 text-sm text-muted">
              Pull questions from the platform bank. You can regenerate the set
              on the next step.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Subject</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Select subject</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {(taskType === "TOPIC_QUIZ" || taskType === "LESSON") && (
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Topic slug</span>
              <input
                value={topicSlug}
                onChange={(e) => setTopicSlug(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                placeholder="e.g. quadratic-equations"
              />
              <span className="text-xs text-muted">
                Classroom topic slug. Quizzes can omit this; lessons need it.
              </span>
            </label>
          )}

          {(taskType === "PAST_PAPER" ||
            taskType === "TOPIC_QUIZ" ||
            taskType === "MOCK_EXAM") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Exam board</span>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {ASSIGNMENT_EXAM_TYPES.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
              {taskType === "PAST_PAPER" && (
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">Year</span>
                  <input
                    type="number"
                    value={examYear}
                    onChange={(e) => setExamYear(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    min={1990}
                    max={new Date().getFullYear()}
                  />
                </label>
              )}
            </div>
          )}

          {needsQuestions && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Difficulty</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {ASSIGNMENT_DIFFICULTIES.map((d) => (
                    <option key={d.value || "any"} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Question count</span>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  min={5}
                  max={80}
                />
              </label>
            </div>
          )}

          <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep("type")}>
              <LuArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="button" onClick={goFiltersNext} disabled={busy}>
              {needsQuestions ? "Generate preview" : "Continue"}
              <LuArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === "preview" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Preview</h2>
              <p className="mt-1 text-sm text-muted">
                BE has no per-question swap yet — regenerate to draw a new set.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={regenBusy || !assignmentId}
              onClick={onRegenerate}
            >
              <LuRefreshCw
                className={cn("h-3.5 w-3.5", regenBusy && "animate-spin")}
              />
              Regenerate
            </Button>
          </div>
          {previewQuestions.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
              No questions in preview. Go back and generate a set.
            </p>
          ) : (
            <ul className="space-y-3">
              {previewQuestions.map((q, i) => (
                <li
                  key={q.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-xs font-semibold text-muted">Q{i + 1}</p>
                  <p className="mt-2 text-sm text-foreground">{q.questionText}</p>
                  {q.options && (
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {Object.entries(q.options).map(([k, v]) => (
                        <li key={k}>
                          <span className="font-semibold text-foreground">{k}.</span>{" "}
                          {v}
                          {q.correctAnswer === k ? (
                            <span className="ml-1 text-tone-green-ink">
                              (answer)
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep("filters")}
            >
              <LuArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="button" onClick={() => setStep("targets")}>
              Continue <LuArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === "targets" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Who gets this?</h2>
            <p className="mt-1 text-sm text-muted">
              Whole center, groups, or specific students.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["CENTER", "Whole center"],
                ["GROUPS", "Groups"],
                ["STUDENTS", "Students"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTargetMode(id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold",
                  targetMode === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {targetMode === "GROUPS" && (
            <div className="space-y-2">
              {(groupsQuery.data?.groups ?? []).length === 0 ? (
                <p className="text-sm text-muted">
                  No groups yet. Create groups on the Roster page.
                </p>
              ) : (
                (groupsQuery.data?.groups ?? []).map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={groupIds.includes(g.id)}
                      onChange={() =>
                        setGroupIds((prev) =>
                          prev.includes(g.id)
                            ? prev.filter((x) => x !== g.id)
                            : [...prev, g.id],
                        )
                      }
                    />
                    {g.name}
                    <span className="text-xs text-muted">
                      ({g.memberCount ?? g.membershipIds?.length ?? 0})
                    </span>
                  </label>
                ))
              )}
            </div>
          )}

          {targetMode === "STUDENTS" && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {(rosterQuery.data?.members ?? [])
                .filter((m) => (m.status ?? "").toUpperCase() === "ACTIVE")
                .map((m) => {
                  const key = membershipKey(m);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={membershipIds.includes(key)}
                        onChange={() =>
                          setMembershipIds((prev) =>
                            prev.includes(key)
                              ? prev.filter((x) => x !== key)
                              : [...prev, key],
                          )
                        }
                      />
                      {memberName(m.firstName, m.lastName)}
                    </label>
                  );
                })}
            </div>
          )}

          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(needsQuestions ? "preview" : "filters")}
            >
              <LuArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => saveThen("settings")}
            >
              Continue <LuArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === "settings" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Settings</h2>
            <p className="mt-1 text-sm text-muted">
              Title, window, attempts, and when students see answers (A-5).
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Instructions</span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              placeholder="Optional note students see before starting"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Opens</span>
              <input
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Due</span>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
          </div>
          {needsQuestions && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">Time limit (minutes)</span>
                  <input
                    type="number"
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    placeholder="Untimed / default"
                    min={1}
                    max={240}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">Attempts allowed</span>
                  <input
                    type="number"
                    value={attemptsAllowed}
                    onChange={(e) =>
                      setAttemptsAllowed(Number(e.target.value) || 1)
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                    min={1}
                    max={20}
                  />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Which attempt counts</span>
                <select
                  value={attemptScoring}
                  onChange={(e) =>
                    setAttemptScoring(e.target.value as AssignmentAttemptScoring)
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {SCORING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Show answers</span>
                <select
                  value={revealAnswers}
                  onChange={(e) =>
                    setRevealAnswers(e.target.value as AssignmentRevealAnswers)
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {REVEAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowLate}
              onChange={(e) => setAllowLate(e.target.checked)}
            />
            Allow late starts after due (flagged)
          </label>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep("targets")}
            >
              <LuArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => saveThen("publish")}
            >
              Review <LuArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === "publish" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Publish</h2>
            <p className="mt-1 text-sm text-muted">
              Targeted students get an Assigned inbox entry and a notification.
            </p>
          </div>
          <dl className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Title</dt>
              <dd className="font-semibold text-right">{title || "Untitled"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Type</dt>
              <dd className="font-semibold">{taskTypeLabel(taskType)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Questions</dt>
              <dd className="font-semibold">
                {needsQuestions
                  ? previewQuestions.length || count
                  : "Lesson link"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Targets</dt>
              <dd className="font-semibold">
                {targetMode === "CENTER"
                  ? "Whole center"
                  : targetMode === "GROUPS"
                    ? `${groupIds.length} group(s)`
                    : `${membershipIds.length} student(s)`}
              </dd>
            </div>
          </dl>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep("settings")}
            >
              <LuArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="button" disabled={busy} onClick={onPublish}>
              <LuCheck className="h-4 w-4" />
              Publish now
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
