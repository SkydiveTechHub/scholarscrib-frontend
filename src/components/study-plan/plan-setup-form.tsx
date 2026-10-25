"use client";

import { useEffect, useRef, useState } from "react";
import { LuCheck, LuSparkles } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { StudyPlanData, StudyPlanPageData } from "@/lib/study-plan";
import { CLASS_LEVELS, TERMS, TERM_LABELS } from "@/lib/curriculum-scope";
import { defaultScope, needsClassPrompt } from "@/lib/study-plan-scope";
import { formSignature, type PlanFormState, type PlanSettings } from "@/lib/study-plan-settings";
import {
  draftFromTimetable,
  timetableForSave,
  validateDraft,
  type TimetableDraft,
} from "@/lib/study-timetable";
import { describePreviewFailure, holdsBackSave } from "@/lib/plan-preview-state";
import { usePreviewStudyPlan } from "@/hooks/api/use-study-plan";
import { useUpdateProfile } from "@/hooks/api/use-user";
import { AvailabilityEditor } from "./availability-editor";
import { chip } from "./chip";
import { ClassMismatchModal } from "./class-mismatch-modal";
import { DeletePlanModal } from "./delete-plan-modal";
import { TimetableEditor } from "./timetable-editor";
import { TimetableReview, type ReviewState } from "./timetable-review";

export type { PlanSettings } from "@/lib/study-plan-settings";
export type PlanSetupStart = "basics" | "availability" | "timetable";

const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "availability", label: "Study time" },
  { id: "timetable", label: "Subjects" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function PlanSetupForm({
  data,
  plan,
  onSubmit,
  onCancel,
  onDelete,
  initialStep = "basics",
}: {
  /** Where to open: the plan page sends students straight to what they want to change. */
  initialStep?: PlanSetupStart;
  data: StudyPlanPageData;
  plan: StudyPlanData | null;
  onSubmit: (settings: PlanSettings) => Promise<string | null>;
  onCancel?: () => void;
  onDelete?: () => Promise<string | null>;
}) {
  // A passed exam date is not pre-filled: saving it would only fail validation.
  const upcomingDate = plan?.targetDate && plan.targetDate > data.today ? plan.targetDate : null;
  const [form, setForm] = useState<PlanFormState>(() => ({
    ...(plan?.scope ?? defaultScope(data.classLevel, data.currentTerm)),
    subjectIds: plan?.subjectIds ?? [],
    studyDays: plan?.studyDays ?? [1, 2, 3, 4, 6],
    weekdayMinutes: plan?.weekdayMinutes ?? data.defaults.weekdayMinutes,
    weekendMinutes: plan?.weekendMinutes ?? data.defaults.weekendMinutes,
    targetExam: (plan?.targetExam as PlanSettings["targetExam"]) ?? null,
    targetDate: upcomingDate,
    forceExamMode: upcomingDate ? (plan?.forceExamMode ?? false) : false,
    draft: draftFromTimetable(plan?.timetable ?? null),
  }));
  const [startSignature] = useState(() => formSignature(form));
  const dirty = formSignature(form) !== startSignature;

  const [preparing, setPreparing] = useState(Boolean(upcomingDate));
  const [step, setStep] = useState<StepId>(initialStep);
  const [stepError, setStepError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const updateProfile = useUpdateProfile();
  const previewPlan = usePreviewStudyPlan();
  const isSS3 = form.classLevel === "SS3";
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  // Edits are only lost if the page goes away; in-app Cancel asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const selectedSubjects = data.subjects.filter((subject) => form.subjectIds.includes(subject.id));
  const hours = {
    studyDays: form.studyDays,
    weekdayMinutes: form.weekdayMinutes,
    weekendMinutes: form.weekendMinutes,
    subjectIds: form.subjectIds,
  };
  const issues = validateDraft(form.draft, hours);

  const patch = (changes: Partial<PlanFormState>) => setForm((current) => ({ ...current, ...changes }));
  const setDraft = (draft: TimetableDraft) => patch({ draft });

  function toggleSubject(id: string) {
    patch({
      subjectIds: form.subjectIds.includes(id)
        ? form.subjectIds.filter((value) => value !== id)
        : [...form.subjectIds, id],
    });
  }

  function toggleDay(day: number) {
    if (form.studyDays.includes(day)) {
      // A rest day has no time of its own. Subjects put on it are kept and flagged.
      const kept = { ...form.draft.dayMinutes };
      delete kept[day];
      patch({
        studyDays: form.studyDays.filter((value) => value !== day),
        draft: { ...form.draft, dayMinutes: kept },
      });
    } else {
      patch({ studyDays: [...form.studyDays, day].sort((a, b) => a - b) });
    }
  }

  function payloadFor(): PlanSettings {
    const { draft, ...rest } = form;
    const exam = preparing && isSS3;
    return {
      ...rest,
      targetExam: exam ? rest.targetExam : null,
      targetDate: exam ? rest.targetDate : null,
      forceExamMode: exam ? rest.forceExamMode : false,
      timetable: timetableForSave(draft),
    };
  }

  /** Why the student cannot leave a step yet, or null. */
  function blocker(from: StepId): string | null {
    if (from === "basics" && form.subjectIds.length === 0) return "Choose at least one subject.";
    if (from === "availability") {
      if (form.studyDays.length === 0) return "Choose at least one study day.";
      // Problems with a day's own time; subjects on a rest day are for the next step.
      const timeIssue = issues.find(
        (row) => row.code === "TOO_SHORT" || (row.code === "REST_DAY" && row.subjectId === null),
      );
      if (timeIssue) return timeIssue.message;
    }
    if (from === "timetable" && issues.length > 0) return "Fix the problems marked on the timetable first.";
    return null;
  }

  function runPreview() {
    previewPlan.mutate(payloadFor());
  }

  function goTo(target: StepId) {
    const targetIndex = STEPS.findIndex((s) => s.id === target);
    for (let i = stepIndex; i < targetIndex; i += 1) {
      const problem = blocker(STEPS[i].id);
      if (problem) {
        setStepError(problem);
        setStep(STEPS[i].id);
        return;
      }
    }
    setStepError("");
    setError("");
    setStep(target);
    if (target === "review") runPreview();
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const problem = await onSubmit(payloadFor());
      if (problem) setError(problem);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!onDelete) return;
    setDeleting(true);
    setDeleteError("");
    const problem = await onDelete();
    setDeleting(false);
    if (problem) setDeleteError(problem);
  }

  function submit() {
    if (needsClassPrompt(form.classLevel, data.classLevel)) {
      setPrompting(true);
      return;
    }
    void save();
  }

  async function updateClassThenSave() {
    setSaving(true);
    setError("");
    try {
      await updateProfile.mutateAsync({ classLevel: form.classLevel });
    } catch {
      setPrompting(false);
      setSaving(false);
      setError("We could not update your class, so the plan was not saved. Please try again.");
      return;
    }
    setPrompting(false);
    setSaving(false);
    await save();
  }

  function keepClassThenSave() {
    setPrompting(false);
    void save();
  }

  function cancel() {
    if (dirty) setDiscarding(true);
    else onCancel?.();
  }

  const failure = previewPlan.isError ? describePreviewFailure(previewPlan.error) : null;
  const timetableInUse = timetableForSave(form.draft) !== null;
  const review: ReviewState = previewPlan.isPending
    ? { status: "loading" }
    : failure?.kind === "unsupported"
      ? { status: "unsupported", timetableInUse }
      : failure
        ? { status: "failed", message: failure.message }
        : previewPlan.data
          ? { status: "ready", preview: previewPlan.data }
          : { status: "loading" };
  const cannotSave =
    saving ||
    review.status === "loading" ||
    holdsBackSave(failure, timetableInUse) ||
    (review.status === "ready" && !review.preview.valid);

  return (
    <div className="card mb-8 p-6">
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        {plan ? "Change your plan" : "Set up your study plan"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Planning for {form.classLevel}, {TERM_LABELS[form.term]}. Tell us when you can study and we&apos;ll keep it realistic.
      </p>

      <nav aria-label="Plan setup steps" className="mt-5">
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {STEPS.map((item, index) => {
            const current = item.id === step;
            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(item.id)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    current
                      ? "border-primary bg-primary text-primary-foreground"
                      : index < stepIndex
                        ? "border-primary/40 bg-primary-soft text-primary-soft-foreground"
                        : "border-border bg-card text-muted hover:border-primary/30",
                  )}
                >
                  <span aria-hidden="true">{index < stepIndex ? <LuCheck className="h-3.5 w-3.5" /> : index + 1}</span>
                  {item.label}
                  {current && <span className="sr-only"> (current step)</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-6">
        <h3 ref={headingRef} tabIndex={-1} className="mb-4 text-base font-bold text-foreground outline-none">
          {step === "basics" && "What are you planning for?"}
          {step === "availability" && "When can you study?"}
          {step === "timetable" && "Which subjects, on which days?"}
          {step === "review" && "Check your plan"}
        </h3>

        {step === "basics" && (
          <div className="space-y-6">
            <div>
              <span className="label" id="class-label">Class</span>
              <div role="group" aria-labelledby="class-label" className="flex flex-wrap gap-2">
                {CLASS_LEVELS.map((level) => (
                  <button key={level} type="button" aria-pressed={form.classLevel === level}
                    onClick={() => patch({ classLevel: level })} className={chip(form.classLevel === level)}>
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label" id="term-label">Term</span>
              <div role="group" aria-labelledby="term-label" className="flex flex-wrap gap-2">
                {TERMS.map((term) => (
                  <button key={term} type="button" aria-pressed={form.term === term}
                    onClick={() => patch({ term })} className={chip(form.term === term)}>
                    {TERM_LABELS[term]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label" id="subjects-label">Subjects</span>
              <div role="group" aria-labelledby="subjects-label" className="flex flex-wrap gap-2">
                {data.subjects.map((subject) => {
                  const selected = form.subjectIds.includes(subject.id);
                  return (
                    <button key={subject.id} type="button" aria-pressed={selected}
                      onClick={() => toggleSubject(subject.id)} className={chip(selected)}>
                      {selected && <LuCheck className="mr-1 inline h-3 w-3" aria-hidden="true" />}
                      {subject.code || subject.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {isSS3 && (
              <div className="rounded-xl border border-border p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input type="checkbox" checked={preparing} onChange={(e) => setPreparing(e.target.checked)} />
                  Preparing for an exam?
                </label>
                {preparing && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <span className="label" id="exam-label">Exam</span>
                      <div role="group" aria-labelledby="exam-label" className="flex gap-2">
                        {(["WAEC", "JAMB", "NECO"] as const).map((exam) => (
                          <button key={exam} type="button" aria-pressed={form.targetExam === exam}
                            onClick={() => patch({ targetExam: exam })}
                            className={cn(chip(form.targetExam === exam), "flex-1 py-2.5")}>
                            {exam}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label>
                      <span className="label">Exam date</span>
                      <input className="input" type="date" value={form.targetDate ?? ""}
                        onChange={(e) => patch({ targetDate: e.target.value || null })} />
                    </label>
                    <label className="flex items-center gap-2 text-sm md:col-span-2">
                      <input type="checkbox" checked={form.forceExamMode}
                        onChange={(e) => patch({ forceExamMode: e.target.checked })} />
                      Exam mode now — pause new term topics and focus on exam revision
                    </label>
                    <p className="text-xs text-muted md:col-span-2">
                      In the last few weeks before your exam, mock exams and past questions take over from your usual timetable.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === "availability" && (
          <AvailabilityEditor
            studyDays={form.studyDays}
            weekdayMinutes={form.weekdayMinutes}
            weekendMinutes={form.weekendMinutes}
            draft={form.draft}
            issues={issues}
            onToggleDay={toggleDay}
            onDefaults={patch}
            onDraft={setDraft}
          />
        )}

        {step === "timetable" && (
          <TimetableEditor
            draft={form.draft}
            hours={hours}
            subjects={selectedSubjects}
            issues={issues}
            onChange={setDraft}
          />
        )}

        {step === "review" && (
          <TimetableReview
            state={review}
            subjects={selectedSubjects}
            onRetry={runPreview}
            onFix={() => goTo("timetable")}
            onUseSmart={() => setDraft({ ...form.draft, mode: "SMART", dayMinutes: {} })}
          />
        )}
      </div>

      {stepError && <p role="alert" className="mt-4 text-sm text-danger">{stepError}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {stepIndex > 0 && (
          <button type="button" onClick={() => goTo(STEPS[stepIndex - 1].id)} className={buttonClass("secondary", "lg")}>
            Back
          </button>
        )}
        {step !== "review" ? (
          <button type="button" onClick={() => goTo(STEPS[stepIndex + 1].id)} className={buttonClass("primary", "lg")}>
            Next
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={cannotSave} className={buttonClass("primary", "lg")}>
            <LuSparkles className="h-4 w-4" aria-hidden="true" />
            {saving ? "Building your plan..." : plan ? "Update plan" : "Create plan"}
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={cancel} className={buttonClass("ghost", "lg")}>Cancel</button>
        )}
        {dirty && <span role="status" className="text-xs text-muted">You have unsaved changes.</span>}
        {plan && onDelete && (
          <button type="button" onClick={() => setConfirmingDelete(true)}
            className={cn(buttonClass("secondary", "lg"), "ml-auto text-danger")}>
            Delete plan
          </button>
        )}
      </div>

      {data.classLevel && (
        <ClassMismatchModal
          open={prompting}
          profileClass={data.classLevel}
          chosenClass={form.classLevel}
          busy={saving}
          onUpdate={updateClassThenSave}
          onKeep={keepClassThenSave}
          onClose={() => setPrompting(false)}
        />
      )}

      <Modal
        open={discarding}
        title="Discard your changes?"
        description="You changed this plan but have not saved it. If you leave now, those changes are lost."
        onClose={() => setDiscarding(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setDiscarding(false)} className={buttonClass("secondary", "md")}>
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => {
                setDiscarding(false);
                onCancel?.();
              }}
              className={buttonClass("primary", "md")}
            >
              Discard changes
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">Your saved plan stays exactly as it is.</p>
      </Modal>

      {onDelete && (
        <DeletePlanModal
          open={confirmingDelete}
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onClose={() => { setConfirmingDelete(false); setDeleteError(""); }}
        />
      )}
    </div>
  );
}
