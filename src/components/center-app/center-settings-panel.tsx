"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuCheck } from "react-icons/lu";
import { CenterEmptyState } from "@/components/center-app/center-empty-state";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateCenter } from "@/hooks/api/use-center";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isApiError } from "@/lib/api/errors";
import { NIGERIAN_STATES } from "@/lib/constants/exam-types";
import {
  CENTER_LEVEL_OPTIONS,
  CENTER_SUBJECT_OPTIONS,
  isCenterOwnerRole,
} from "@/lib/center-subjects";
import { cn } from "@/lib/utils";

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/**
 * Owner-only form to edit the active center's name, location, subjects, and
 * levels. Facilitators see a read-only notice.
 */
export function CenterSettingsPanel({
  preferredCenterId,
}: {
  preferredCenterId?: string | null;
}) {
  const { centersQuery, center, centerId, hasMultiple } =
    useActiveCenter(preferredCenterId);
  const update = useUpdateCenter(centerId ?? "");

  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!center) return;
    setName(center.name ?? "");
    setState(center.state ?? "");
    setLga(center.lga ?? "");
    setSubjects([...(center.subjects ?? [])]);
    setLevels([...(center.levels ?? [])]);
    setError("");
    setSaved(false);
  }, [center]);

  if (centersQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!center || !centerId) {
    return (
      <div className="space-y-4">
        <CenterEmptyState
          title="No center yet"
          message="Create a center first, then you can edit its details here."
        />
        <Link
          href="/center/onboarding"
          className={buttonClass("primary", "md", "w-full sm:w-auto")}
        >
          Set up your center
        </Link>
      </div>
    );
  }

  const isOwner = isCenterOwnerRole(center.staffRole);
  if (!isOwner) {
    return (
      <CenterEmptyState
        title="Owner only"
        message="Only the center owner can change name, location, subjects, or levels. Ask the owner if something needs updating."
      />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!centerId) return;
    setError("");
    setSaved(false);

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("Center name must be 2–80 characters.");
      return;
    }
    if (!state) {
      setError("Pick a state.");
      return;
    }
    if (!lga.trim()) {
      setError("LGA is required.");
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
      await update.mutateAsync({
        name: trimmedName,
        state,
        lga: lga.trim(),
        subjects,
        levels,
      });
      setSaved(true);
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message || "Could not save changes."
          : "Could not save changes. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      {hasMultiple ? (
        <p className="text-sm text-muted">
          Editing <span className="font-semibold text-foreground">{center.name}</span>
          . Switch centers from the sidebar if this is the wrong one.
        </p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger">
          {error}
        </div>
      ) : null}
      {saved && !error ? (
        <div className="rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm font-medium text-success">
          Center details saved.
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Basics</h2>
          <p className="text-sm text-muted">
            Students see this name on invites and assigned work.
          </p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Center name</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            maxLength={80}
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">State</span>
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            required
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
            onChange={(e) => {
              setLga(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            maxLength={80}
            required
          />
        </label>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">What you teach</h2>
          <p className="text-sm text-muted">
            Subjects and levels this center covers.
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
                  onClick={() => {
                    setSubjects((prev) => toggle(prev, subject));
                    setSaved(false);
                  }}
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
                  onClick={() => {
                    setLevels((prev) => toggle(prev, level.value));
                    setSaved(false);
                  }}
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
      </section>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={busy || update.isPending}>
          {busy || update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
