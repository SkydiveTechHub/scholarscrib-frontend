"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/admin/status-banner";
import { useSaveSubject, type SubjectInput } from "@/hooks/api/use-admin-curriculum";
import type { AdminSubjectOut, TrackCategory } from "@/lib/api/types";

export const TRACKS: { value: TrackCategory; label: string }[] = [
  { value: "CORE", label: "Core" },
  { value: "SCIENCE", label: "Science" },
  { value: "ARTS", label: "Arts" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "VOCATIONAL", label: "Vocational" },
];

export function trackLabel(value?: string | null) {
  return TRACKS.find((t) => t.value === value)?.label ?? "Uncategorised";
}

const BOARDS = [
  { key: "isWaec", label: "WAEC" },
  { key: "isJamb", label: "JAMB" },
  { key: "isNeco", label: "NECO" },
] as const;

export function SubjectForm({
  subject,
  onClose,
  onSaved,
}: {
  /** Omit to create. */
  subject?: AdminSubjectOut;
  onClose: () => void;
  onSaved: (subject: AdminSubjectOut) => void;
}) {
  const save = useSaveSubject();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<SubjectInput>({
    name: subject?.name ?? "",
    code: subject?.code ?? "",
    trackCategory: (subject?.trackCategory as TrackCategory) ?? "CORE",
    isWaec: subject?.isWaec ?? false,
    isJamb: subject?.isJamb ?? false,
    isNeco: subject?.isNeco ?? false,
    isActive: subject?.isActive ?? true,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const saved = await save.mutateAsync({
        id: subject?.id,
        body: { ...draft, name: draft.name.trim(), code: draft.code.trim().toUpperCase() },
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the subject.");
    }
  }

  return (
    <Modal
      open
      title={subject ? "Edit subject" : "New subject"}
      description={subject ? undefined : "Add the subject first, then give it term slots and topics."}
      busy={save.isPending}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="subject-form" size="sm" disabled={save.isPending}>
            {save.isPending ? "Saving…" : subject ? "Save changes" : "Add subject"}
          </Button>
        </div>
      }
    >
      <form id="subject-form" onSubmit={submit} className="space-y-4">
        {error && <StatusBanner tone="error" title={error} />}
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <label className="text-sm">
            <span className="label">Name</span>
            <input
              className="input"
              value={draft.name}
              minLength={2}
              maxLength={120}
              required
              placeholder="Further Mathematics"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="label">Code</span>
            <input
              className="input uppercase"
              value={draft.code}
              minLength={2}
              maxLength={16}
              required
              placeholder="FMTH"
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="label">Track</span>
          <select
            className="input"
            value={draft.trackCategory}
            onChange={(e) => setDraft({ ...draft, trackCategory: e.target.value as TrackCategory })}
          >
            {TRACKS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="label">Examined by</legend>
          <div className="flex flex-wrap gap-2">
            {BOARDS.map((b) => (
              <label
                key={b.key}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60"
              >
                <input
                  type="checkbox"
                  checked={draft[b.key]}
                  onChange={(e) => setDraft({ ...draft, [b.key]: e.target.checked })}
                />
                {b.label}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
