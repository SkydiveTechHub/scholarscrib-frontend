"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBanner } from "@/components/admin/status-banner";
import { Button } from "@/components/ui/button";
import { useResolveWithdrawRequest } from "@/hooks/api/use-admin-centers";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const INPUT_CLS =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

export function WithdrawResolveControls({
  withdrawalId,
  status,
  className,
}: {
  withdrawalId: string;
  status: string;
  className?: string;
}) {
  const router = useRouter();
  const resolve = useResolveWithdrawRequest();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"fulfil" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = status.toUpperCase() === "PENDING";
  if (!pending) return null;

  async function run(fulfil: boolean) {
    setBusy(fulfil ? "fulfil" : "reject");
    setError(null);
    try {
      await resolve.mutateAsync({
        withdrawalId,
        body: { fulfil, note: note.trim() || null },
      });
      router.refresh();
    } catch (err) {
      setError(
        isApiError(err)
          ? err.message
          : fulfil
            ? "Could not fulfil this request."
            : "Could not reject this request.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {error && <StatusBanner tone="error" title={error} />}
      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Ops note (optional)
        </span>
        <input
          className={INPUT_CLS}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          placeholder="Payout ref, reason…"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={busy !== null}
          onClick={() => void run(true)}
        >
          {busy === "fulfil" ? "Saving…" : "Fulfil"}
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={busy !== null}
          onClick={() => void run(false)}
        >
          {busy === "reject" ? "Saving…" : "Reject"}
        </Button>
      </div>
    </div>
  );
}
