"use client";

import { Modal } from "@/components/ui/modal";
import { buttonClass } from "@/components/ui/button";

export function DeletePlanModal({
  open,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Delete your study plan?"
      description="Your schedule goes away and you can build a new plan any time. Sessions you already completed stay in your progress."
      busy={busy}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} onClick={onClose} className={buttonClass("secondary", "md")}>
            Keep my plan
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className={buttonClass("primary", "md")}>
            {busy ? "Deleting..." : "Delete plan"}
          </button>
        </div>
      }
    >
      {error && <p className="text-sm text-danger">{error}</p>}
    </Modal>
  );
}
