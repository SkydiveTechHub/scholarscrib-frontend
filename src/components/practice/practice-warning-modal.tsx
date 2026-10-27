"use client";

import { LuTriangleAlert } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { PracticeWarnings } from "@/lib/practice-warnings";

/**
 * Shown before practice starts when it may stray from the student's class
 * level or track. Nothing proceeds until they choose.
 */
export function PracticeWarningModal({
  warnings,
  classLevel,
  onCancel,
  onContinue,
}: {
  warnings: PracticeWarnings;
  classLevel?: string | null;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const subjects = warnings.offTrackSubjects.join(", ");
  return (
    <Modal
      open
      title="Before you continue"
      onClose={onCancel}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel}>
            Go back
          </Button>
          <Button onClick={onContinue}>Continue anyway</Button>
        </div>
      }
    >
      <div className="space-y-3">
        {warnings.beyondClass && (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning">
            <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="leading-relaxed">
              You&apos;re in {classLevel}. Past questions cover the full syllabus, so you
              may meet questions beyond your class level. Your score will still count
              towards your performance record.
            </p>
          </div>
        )}
        {warnings.offTrack && (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning">
            <LuTriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="leading-relaxed">
              {subjects} {warnings.offTrackSubjects.length === 1 ? "isn't" : "aren't"}{" "}
              part of your track. Attempting {warnings.offTrackSubjects.length === 1 ? "it" : "them"}{" "}
              could affect your performance record.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
