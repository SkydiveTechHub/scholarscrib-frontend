"use client";

import { LuStar } from "react-icons/lu";
import { useExamActive } from "@/stores/exam-store";
import {
  useTutorStore,
  type TutorAutoSend,
  type TutorEntry,
} from "@/stores/tutor-store";
import { cn } from "@/lib/utils";

/** Opens Astra on a specific item ("Explain this"). Renders nothing mid-exam. */
export function AskAstraButton({
  entry,
  autoSend,
  label = "Explain this",
  className,
}: {
  entry: TutorEntry;
  /** Sent to Astra as the student's first message as soon as the panel opens. */
  autoSend?: TutorAutoSend;
  label?: string;
  className?: string;
}) {
  const openPanel = useTutorStore((s) => s.openPanel);
  const examActive = useExamActive();
  if (examActive) return null;
  return (
    <button
      type="button"
      onClick={() => openPanel(entry, autoSend)}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold text-primary transition-colors hover:bg-primary-soft",
        className,
      )}
    >
      <LuStar className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
