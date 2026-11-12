"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuArrowRight, LuCheck } from "react-icons/lu";
import { CenterInviteShare } from "@/components/center-app/center-invite-share";
import { Button } from "@/components/ui/button";
import { useCreateCenter } from "@/hooks/api/use-center";
import { useActiveCenter } from "@/hooks/use-active-center";
import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { request } from "@/lib/api/http";
import type { CenterInviteOut, CenterOut } from "@/lib/api/types";
import { NIGERIAN_STATES } from "@/lib/constants/exam-types";
import {
  CENTER_LEVEL_OPTIONS,
  CENTER_SUBJECT_OPTIONS,
} from "@/lib/center-subjects";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "offerings", label: "Subjects & levels" },
  { id: "invite", label: "Invite" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function CenterOnboardingWizard() {
  const router = useRouter();
  const { setActiveCenterId } = useActiveCenter();
  const createCenter = useCreateCenter();
  const [step, setStep] = useState<StepId>("basics");
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [center, setCenter] = useState<CenterOut | null>(null);
  const [invite, setInvite] = useState<CenterInviteOut | null>(null);

  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function submitCenter() {
    setError("");
    if (!name.trim() || !state || !lga.trim()) {
      setError("Name, state, and LGA are required.");
      return;
    }
    if (subjects.length === 0) {
      setError("Pick at least one subject.");
      return;
    }
    if (levels.length === 0) {
      setError("Pick at least one level.");
      return;
    }

    setBusy(true);
    try {
      const created = await createCenter.mutateAsync({
        name: name.trim(),
        state,
        lga: lga.trim(),
        subjects,
        levels,
      });
      if (!created?.id) {
        throw new Error("Center was created but no id was returned.");
      }
      // New center becomes the active one so Roster shows its invite, not
      // another center the tutor already staffs.
      setActiveCenterId(created.id);
      setCenter(created);
      const inviteOut = await request<{ invite: CenterInviteOut }>({
        method: "POST",
        url: endpoints.centerApi.invites.create(created.id),
        data: {},
        realm: "tutor",
      });
      setInvite(inviteOut.invite);
      setStep("invite");
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message || "Could not create the center."
          : "Could not create the center. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ol className="flex gap-2" aria-label="Onboarding steps">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= stepIndex ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </ol>

      {error && (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      {step === "basics" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Name your center</h2>
            <p className="mt-1 text-sm text-muted">
              Students will see this name on the invite and on assigned work.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Center name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bright Path Tutorials"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">State</span>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            >
              <option value="">Select state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">LGA</span>
            <input
              value={lga}
              onChange={(e) => setLga(e.target.value)}
              placeholder="Local Government Area"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            />
          </label>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => {
                setError("");
                if (!name.trim() || !state || !lga.trim()) {
                  setError("Name, state, and LGA are required.");
                  return;
                }
                setStep("offerings");
              }}
            >
              Continue <LuArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "offerings" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">What do you teach?</h2>
            <p className="mt-1 text-sm text-muted">
              Pick the subjects and levels this center covers.
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Subjects</legend>
            <div className="flex flex-wrap gap-2">
              {CENTER_SUBJECT_OPTIONS.map((subject) => {
                const on = subjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggle(subjects, subject, setSubjects)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on
                        ? "border-primary bg-primary-soft text-primary-soft-foreground"
                        : "border-border bg-card text-muted hover:text-foreground",
                    )}
                  >
                    {on && <LuCheck className="mr-1 inline h-3 w-3" />}
                    {subject}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Levels</legend>
            <div className="flex flex-wrap gap-2">
              {CENTER_LEVEL_OPTIONS.map((level) => {
                const on = levels.includes(level.value);
                return (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => toggle(levels, level.value, setLevels)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on
                        ? "border-primary bg-primary-soft text-primary-soft-foreground"
                        : "border-border bg-card text-muted hover:text-foreground",
                    )}
                  >
                    {on && <LuCheck className="mr-1 inline h-3 w-3" />}
                    {level.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep("basics")}>
              <LuArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void submitCenter()}
            >
              {busy ? "Creating…" : "Create & get invite"}
              <LuArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "invite" && center && invite && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {center.name} is ready
            </h2>
            <p className="mt-1 text-sm text-muted">
              Share the invite so students can join. You can always copy it again
              from Roster.
            </p>
          </div>
          <CenterInviteShare
            centerName={center.name}
            code={invite.code}
            url={invite.link ?? invite.url}
          />
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              router.push("/center/roster");
              router.refresh();
            }}
          >
            Go to roster
          </Button>
        </div>
      )}
    </div>
  );
}
