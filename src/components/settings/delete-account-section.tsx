"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useDeleteAccount } from "@/hooks/api/use-user";
import { studentAccountDeleted } from "@/lib/client-session";
import { FormMessage, Section, inputClass, labelClass } from "./section";

/**
 * Permanent self-service account deletion. Accounts with a password confirm
 * with it; Google-only accounts have none, so they type their email instead.
 */
export function DeleteAccountSection({
  email,
  hasPassword,
}: {
  email: string | null;
  hasPassword: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const deleteAccount = useDeleteAccount();
  const busy = deleteAccount.isPending;

  // Without an email on file there is nothing to type back, so the server's
  // own check decides; the button only needs some input.
  const canConfirm = hasPassword
    ? value.length > 0
    : value.trim().toLowerCase() === (email ?? "").toLowerCase() && value.trim() !== "";

  function close() {
    if (busy) return;
    setOpen(false);
    setValue("");
    setError("");
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!canConfirm || busy) return;
    setError("");

    try {
      await deleteAccount.mutateAsync(
        hasPassword ? { password: value } : { confirmEmail: value.trim() },
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      return;
    }

    // The server already removed this device's push rows, so only the browser
    // subscription is left to drop. A failure here must not strand the user.
    try {
      const { unsubscribeThisDeviceLocally } = await import("@/lib/push-client");
      await unsubscribeThisDeviceLocally();
    } catch {
      // Ignored: the account is gone either way.
    }
    studentAccountDeleted();
  }

  return (
    <>
      <Section
        title="Delete account"
        description="Permanently delete your account and all of your data. This cannot be undone."
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={buttonClass("danger", "md")}
        >
          Delete my account
        </button>
      </Section>

      <Modal
        open={open}
        title="Delete your account?"
        description="This permanently deletes your account. You will be signed out on every device."
        busy={busy}
        onClose={close}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={buttonClass("secondary", "md")}
            >
              Keep my account
            </button>
            <button
              type="submit"
              form="delete-account-form"
              disabled={busy || !canConfirm}
              className={buttonClass("danger", "md")}
            >
              {busy ? "Deleting..." : "Delete account"}
            </button>
          </div>
        }
      >
        <form id="delete-account-form" onSubmit={confirm} className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Your progress, study plans, flashcards and tutor chats are erased.</li>
            <li>An active paid subscription is not refunded.</li>
            <li>You can register again later, but nothing can be recovered.</li>
          </ul>

          <FormMessage error={error} />

          <div>
            <label className={labelClass} htmlFor="deleteAccountConfirm">
              {hasPassword ? "Enter your password to confirm" : "Type your email to confirm"}
            </label>
            <input
              id="deleteAccountConfirm"
              type={hasPassword ? "password" : "email"}
              autoComplete={hasPassword ? "current-password" : "off"}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              disabled={busy}
              placeholder={hasPassword ? undefined : (email ?? undefined)}
              className={inputClass}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
