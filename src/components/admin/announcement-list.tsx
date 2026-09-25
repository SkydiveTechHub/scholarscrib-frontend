"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StatusBanner } from "@/components/admin/status-banner";
import { describeAudience, parseStoredAudience } from "@/lib/push-audience";
import { fetchApi } from "@/lib/api/client";
import type { AdminAnnouncementRow } from "@/lib/announcement-data";

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Queued",
  SENDING: "Sending",
  SENT: "Sent",
  CANCELLED: "Cancelled",
};

export function AnnouncementList({ rows }: { rows: AdminAnnouncementRow[] }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState<AdminAnnouncementRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!cancelling) return;
    setBusy(true);
    setError(null);
    try {
      await fetchApi(`/admin/api/announcements/${cancelling.id}/cancel`, {
        method: "POST",
        body: {},
        realm: "admin",
      });
      setCancelling(null);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not cancel the announcement",
      );
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted">No announcements yet.</p>;
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">Recent</h2>
        <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
          Refresh
        </Button>
      </div>
      {error && <StatusBanner tone="error" title={error} className="mt-3" />}
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2">Announcement</th>
              <th className="px-3 py-2">Audience</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Delivered</th>
              <th className="px-3 py-2">Sent by</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const audience = parseStoredAudience(row.audience);
              return (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <p className="font-semibold">{row.title}</p>
                    <p className="text-xs text-muted">{row.createdAtLabel}</p>
                  </td>
                  <td className="px-3 py-2">{audience ? describeAudience(audience) : "—"}</td>
                  <td className="px-3 py-2">{STATUS_LABEL[row.status] ?? row.status}</td>
                  <td className="px-3 py-2">
                    {row.status === "SENDING" || row.status === "QUEUED"
                      ? `${row.recipientCount - row.pendingCount} / ${row.recipientCount}`
                      : `${row.sentCount} sent · ${row.failedCount} failed · ${row.recipientCount} devices`}
                  </td>
                  <td className="px-3 py-2">{row.createdBy}</td>
                  <td className="px-3 py-2 text-right">
                    {(row.status === "QUEUED" || row.status === "SENDING") && (
                      <Button variant="outline" size="sm" onClick={() => setCancelling(row)}>
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancel this announcement?"
        description="Devices that have not received it yet won't, and the dashboard banner disappears. Notifications already delivered stay delivered."
        confirmLabel="Cancel announcement"
        busy={busy}
        onConfirm={cancel}
        onCancel={() => setCancelling(null)}
      />
    </section>
  );
}
