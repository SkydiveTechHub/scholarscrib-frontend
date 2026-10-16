"use client";

import { useState } from "react";
import { LuCheck, LuSparkles } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudyPlanData, StudyPlanPageData } from "@/lib/study-plan";
import { CLASS_LEVELS, TERMS, TERM_LABELS, type ClassLevel, type Term } from "@/lib/curriculum-scope";
import { defaultScope, needsClassPrompt } from "@/lib/study-plan-scope";
import { useUpdateProfile } from "@/hooks/api/use-user";
import { ClassMismatchModal } from "./class-mismatch-modal";
import { DeletePlanModal } from "./delete-plan-modal";

const DAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 7, label: "Sun" },
];

export type PlanSettings = {
  classLevel: ClassLevel;
  term: Term;
  subjectIds: string[];
  studyDays: number[];
  weekdayMinutes: number;
  weekendMinutes: number;
  targetExam: "WAEC" | "JAMB" | "NECO" | null;
  targetDate: string | null;
  forceExamMode: boolean;
};

function chip(selected: boolean) {
  return cn(
    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
    selected
      ? "border-primary bg-primary text-primary-foreground shadow-soft"
      : "border-border bg-card text-muted hover:border-primary/30",
  );
}

export function PlanSetupForm({
  data,
  plan,
  onSubmit,
  onCancel,
  onDelete,
}: {
  data: StudyPlanPageData;
  plan: StudyPlanData | null;
  onSubmit: (settings: PlanSettings) => Promise<string | null>;
  onCancel?: () => void;
  onDelete?: () => Promise<string | null>;
}) {
  // A passed exam date is not pre-filled: saving it would only fail validation.
  const upcomingDate = plan?.targetDate && plan.targetDate > data.today ? plan.targetDate : null;
  const [settings, setSettings] = useState<PlanSettings>(() => ({
    ...(plan?.scope ?? defaultScope(data.classLevel, data.currentTerm)),
    subjectIds: plan?.subjectIds ?? [],
    studyDays: plan?.studyDays ?? [1, 2, 3, 4, 6],
    weekdayMinutes: plan?.weekdayMinutes ?? data.defaults.weekdayMinutes,
    weekendMinutes: plan?.weekendMinutes ?? data.defaults.weekendMinutes,
    targetExam: (plan?.targetExam as PlanSettings["targetExam"]) ?? null,
    targetDate: upcomingDate,
    forceExamMode: upcomingDate ? (plan?.forceExamMode ?? false) : false,
  }));
  const [preparing, setPreparing] = useState(Boolean(upcomingDate));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const updateProfile = useUpdateProfile();
  const isSS3 = settings.classLevel === "SS3";

  const toggle = <K extends "subjectIds" | "studyDays">(key: K, value: PlanSettings[K][number]) =>
    setSettings((s) => {
      const list = s[key] as (string | number)[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...s, [key]: next };
    });

  function payloadFor(): PlanSettings {
    return preparing && isSS3
      ? settings
      : { ...settings, targetExam: null, targetDate: null, forceExamMode: false };
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
    if (needsClassPrompt(settings.classLevel, data.classLevel)) {
      setPrompting(true);
      return;
    }
    void save();
  }

  async function updateClassThenSave() {
    setSaving(true);
    setError("");
    try {
      await updateProfile.mutateAsync({ classLevel: settings.classLevel });
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

  return (
    <div className="card mb-8 p-6">
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        {plan ? "Change your plan" : "Set up your study plan"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Planning for {settings.classLevel}, {TERM_LABELS[settings.term]}. Tell us when you can study and we&apos;ll keep it realistic.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <span className="label">Class</span>
          <div className="flex flex-wrap gap-2">
            {CLASS_LEVELS.map((level) => (
              <button key={level} type="button" aria-pressed={settings.classLevel === level}
                onClick={() => setSettings({ ...settings, classLevel: level })}
                className={chip(settings.classLevel === level)}>
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Term</span>
          <div className="flex flex-wrap gap-2">
            {TERMS.map((term) => (
              <button key={term} type="button" aria-pressed={settings.term === term}
                onClick={() => setSettings({ ...settings, term })}
                className={chip(settings.term === term)}>
                {TERM_LABELS[term]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Subjects</span>
          <div className="flex flex-wrap gap-2">
            {data.subjects.map((subject) => {
              const selected = settings.subjectIds.includes(subject.id);
              return (
                <button key={subject.id} type="button" aria-pressed={selected}
                  onClick={() => toggle("subjectIds", subject.id)} className={chip(selected)}>
                  {selected && <LuCheck className="mr-1 inline h-3 w-3" />}
                  {subject.code || subject.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="label">Study days</span>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const selected = settings.studyDays.includes(day.value);
              return (
                <button key={day.value} type="button" aria-pressed={selected}
                  onClick={() => toggle("studyDays", day.value)} className={chip(selected)}>
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label>
            <span className="label">Minutes on a school day</span>
            <input className="input" type="number" min={0} max={480} step={15} value={settings.weekdayMinutes}
              onChange={(e) => setSettings({ ...settings, weekdayMinutes: Number(e.target.value) || 0 })} />
          </label>
          <label>
            <span className="label">Minutes on a weekend day</span>
            <input className="input" type="number" min={0} max={600} step={15} value={settings.weekendMinutes}
              onChange={(e) => setSettings({ ...settings, weekendMinutes: Number(e.target.value) || 0 })} />
          </label>
        </div>
        <p className="-mt-3 text-xs text-muted">Keep it realistic — a plan you keep beats a plan you abandon.</p>

        {isSS3 && (
          <div className="rounded-xl border border-border p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <input type="checkbox" checked={preparing} onChange={(e) => setPreparing(e.target.checked)} />
              Preparing for an exam?
            </label>
            {preparing && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <span className="label">Exam</span>
                  <div className="flex gap-2">
                    {(["WAEC", "JAMB", "NECO"] as const).map((exam) => (
                      <button key={exam} type="button" aria-pressed={settings.targetExam === exam}
                        onClick={() => setSettings({ ...settings, targetExam: exam })}
                        className={cn(chip(settings.targetExam === exam), "flex-1 py-2.5")}>
                        {exam}
                      </button>
                    ))}
                  </div>
                </div>
                <label>
                  <span className="label">Exam date</span>
                  <input className="input" type="date" value={settings.targetDate ?? ""}
                    onChange={(e) => setSettings({ ...settings, targetDate: e.target.value || null })} />
                </label>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" checked={settings.forceExamMode}
                    onChange={(e) => setSettings({ ...settings, forceExamMode: e.target.checked })} />
                  Exam mode now — pause new term topics and focus on exam revision
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={submit}
          disabled={saving || settings.subjectIds.length === 0 || settings.studyDays.length === 0}
          className={buttonClass("primary", "lg")}>
          <LuSparkles className="h-4 w-4" />
          {saving ? "Building your plan..." : plan ? "Update plan" : "Create plan"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass("secondary", "lg")}>Cancel</button>
        )}
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
          chosenClass={settings.classLevel}
          busy={saving}
          onUpdate={updateClassThenSave}
          onKeep={keepClassThenSave}
          onClose={() => setPrompting(false)}
        />
      )}

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
