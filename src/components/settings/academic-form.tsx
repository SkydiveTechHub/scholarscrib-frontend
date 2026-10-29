"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useUpdateProfile } from "@/hooks/api/use-user";
import { Modal } from "@/components/ui/modal";
import { buttonClass } from "@/components/ui/button";
import { FormMessage, Section, labelClass, submitClass } from "./section";

const LEVELS = ["SS1", "SS2", "SS3"];
const TRACKS = [
  { value: "SCIENCE", label: "Science" },
  { value: "ARTS", label: "Arts" },
  { value: "COMMERCIAL", label: "Commercial" },
];

export function AcademicForm({
  classLevel,
  track,
}: {
  classLevel: string | null;
  track: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    classLevel: classLevel ?? "",
    track: track ?? "",
  });
  const [loading, setLoading] = useState(false);
  const updateProfile = useUpdateProfile();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const changed = form.classLevel !== (classLevel ?? "") || form.track !== (track ?? "");

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.classLevel || !form.track) {
      setError("Pick both a class level and a track.");
      return;
    }

    // A study plan is built for one class level and track, so changing either
    // deletes it. Say so before it happens.
    if (changed) {
      setConfirming(true);
      return;
    }
    void save();
  }

  async function save() {
    setConfirming(false);
    setLoading(true);
    setError("");

    try {
      await updateProfile.mutateAsync(form);

      toast.success("Class details saved.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const optionClass = (selected: boolean) =>
    `py-3 rounded-xl border text-center text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
      selected
        ? "border-primary bg-primary-soft text-primary-soft-foreground shadow-soft"
        : "border-border bg-card text-foreground hover:border-primary/30"
    }`;

  return (
    <Section
      title="Class & track"
      description="These decide which subjects and past questions you see."
    >
      <FormMessage error={error} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <span className={labelClass}>Class level</span>
          <div className="grid grid-cols-3 gap-3">
            {LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={form.classLevel === level}
                onClick={() => update("classLevel", level)}
                className={optionClass(form.classLevel === level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={labelClass}>Track</span>
          <div className="grid grid-cols-3 gap-3">
            {TRACKS.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={form.track === t.value}
                onClick={() => update("track", t.value)}
                className={optionClass(form.track === t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Said up front, not only in the confirmation: the user should know
            before they pick, and the modal then repeats what they expect. */}
        <p
          className={`text-xs ${changed ? "font-semibold text-tone-amber-ink" : "text-muted"}`}
        >
          Changing your class level or track resets your study plan.
        </p>

        <button type="submit" disabled={loading || !changed} className={submitClass}>
          {loading ? "Saving..." : "Save changes"}
        </button>
      </form>

      <Modal
        open={confirming}
        title="Change your class or track?"
        description="Here is what happens when you switch:"
        onClose={() => setConfirming(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={buttonClass("secondary", "md")}
            >
              Keep current
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className={buttonClass("primary", "md")}
            >
              Change and delete plan
            </button>
          </div>
        }
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
          <li>Your current study plan is deleted.</li>
          <li>Your library switches to the subjects for your new track.</li>
          <li>Sessions you already completed stay in your progress.</li>
          <li>You can build a new plan any time.</li>
        </ul>
      </Modal>
    </Section>
  );
}
