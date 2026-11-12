"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCreateRecommendation } from "@/hooks/api/use-center-recommendations";
import { isApiError } from "@/lib/api/errors";

const MAX_BODY = 2000;

/**
 * C-1 compose recommendation: free text to one student, a group, or the center.
 * Links are stripped server-side (C-7).
 */
export function ComposeRecommendationButton({
  centerId,
  studentId,
  studentName,
  groupId,
  groupName,
  toCenter,
  assignmentId,
  label = "Recommend",
}: {
  centerId: string;
  studentId?: string | null;
  studentName?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  toCenter?: boolean;
  assignmentId?: string | null;
  label?: string;
}) {
  const create = useCreateRecommendation(centerId);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const audience = toCenter
    ? "everyone in this center"
    : groupName
      ? `group “${groupName}”`
      : studentName || "this student";

  async function send() {
    setError("");
    const text = body.trim();
    if (!text) {
      setError("Write a short recommendation first.");
      return;
    }
    try {
      await create.mutateAsync({
        body: text,
        studentId: studentId || undefined,
        groupId: groupId || undefined,
        toCenter: Boolean(toCenter),
        assignmentId: assignmentId || undefined,
      });
      setSent(true);
      setBody("");
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message || "Could not send recommendation."
          : "Could not send recommendation.",
      );
    }
  }

  function close() {
    if (create.isPending) return;
    setOpen(false);
    setError("");
    setSent(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setSent(false);
          setError("");
          setOpen(true);
        }}
      >
        {label}
      </Button>

      <Modal
        open={open}
        onClose={close}
        busy={create.isPending}
        title={sent ? "Sent" : "Send a recommendation"}
        description={
          sent
            ? `Delivered to ${audience}.`
            : `Advisory note for ${audience}. Students can mark it done — it will not rewrite their study plan.`
        }
        footer={
          sent ? (
            <div className="flex justify-end">
              <Button type="button" onClick={close}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={create.isPending}
                onClick={close}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={create.isPending || !body.trim()}
                onClick={() => void send()}
              >
                {create.isPending ? "Sending…" : "Send"}
              </Button>
            </div>
          )
        }
      >
        {sent ? (
          <p className="text-sm text-muted">
            They will see it in Recommendations and get a notification.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-foreground">
                What should they revise or practise?
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
                rows={5}
                maxLength={MAX_BODY}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                placeholder="e.g. Revisit Simultaneous Equations — focus on the word problems from this quiz."
              />
              <span className="block text-xs text-muted">
                {body.length}/{MAX_BODY} · Links are removed automatically
              </span>
            </label>
            {error && (
              <div className="rounded-xl border border-danger/25 bg-danger-soft p-3 text-sm text-danger">
                {error}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
