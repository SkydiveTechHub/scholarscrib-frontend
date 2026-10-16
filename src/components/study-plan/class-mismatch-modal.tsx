"use client";

import { Modal } from "@/components/ui/modal";
import { buttonClass } from "@/components/ui/button";

/** Asked when a plan is for a different class than the account's. */
export function ClassMismatchModal({
  open,
  profileClass,
  chosenClass,
  busy,
  onUpdate,
  onKeep,
  onClose,
}: {
  open: boolean;
  profileClass: string;
  chosenClass: string;
  busy: boolean;
  onUpdate: () => void;
  onKeep: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Update your class?"
      description={`Your account is set to ${profileClass}. Update it to ${chosenClass} as well?`}
      busy={busy}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} onClick={onKeep} className={buttonClass("secondary", "md")}>
            Keep {profileClass}
          </button>
          <button type="button" disabled={busy} onClick={onUpdate} className={buttonClass("primary", "md")}>
            Update my class
          </button>
        </div>
      }
    >
      <p className="text-sm text-muted">
        Either way, this plan will be for {chosenClass}.
      </p>
    </Modal>
  );
}
