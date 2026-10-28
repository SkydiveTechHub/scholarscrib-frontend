"use client";

import { useState } from "react";
import { LuMailWarning } from "react-icons/lu";
import { VerifyEmailModal } from "./verify-email-modal";

/**
 * Shown on the dashboard and profile when `emailVerified` is falsy.
 * Clicking "Verify now" opens the OTP modal.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-tone-amber-line bg-tone-amber-soft px-4 py-3.5 text-sm"
      >
        <LuMailWarning className="h-5 w-5 flex-shrink-0 text-tone-amber-ink" />
        <p className="flex-1 font-medium text-tone-amber-ink">
          Please verify your email address to enjoy full access to your account.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-tone-amber-ink px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          Verify now
        </button>
      </div>

      <VerifyEmailModal
        open={open}
        email={email}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
