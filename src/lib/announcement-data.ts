import { api } from "@/lib/api/server";
import type { AnnouncementRow, AnnouncementsOut } from "@/lib/api/types";

/**
 * Student-facing announcements, served by the backend, not read from a local
 * database. The admin console's announcement table, push queues and audience
 * previews all live behind `/admin/api/announcements` now.
 */

function asBanner(
  row: Record<string, unknown> | undefined,
): { id: string; title: string; body: string; url: string | null } | null {
  if (!row) return null;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    url: typeof row.url === "string" && row.url ? row.url : null,
  };
}

/**
 * The newest active announcement this student has not dismissed, or null.
 * `GET /api/announcements` returns undismissed, unexpired announcements
 * filtered to the caller's audience (the token identifies the student).
 */
export async function getBannerAnnouncement(): Promise<
  { id: string; title: string; body: string; url: string | null } | null
> {
  try {
    const { announcements } = await api<AnnouncementsOut>("/api/announcements");
    return asBanner(announcements[0]);
  } catch (error) {
    // A banner is decoration, not a page requirement: if the announcement
    // read fails, the dashboard renders without one rather than failing.
    console.error("Loading banner announcement failed:", error);
    return null;
  }
}

export type { AnnouncementRow };

/** Admin: a row of the announcement table as the console renders it. */
export type AdminAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  status: string;
  audience?: unknown;
  createdAtLabel: string | null;
  recipientCount: number;
  pendingCount: number;
  sentCount: number;
  failedCount: number;
  createdBy: string | null;
};

function asAdminRow(row: Record<string, unknown>): AdminAnnouncementRow {
  const num = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    status: String(row.status ?? "").toUpperCase(),
    audience: row.audience,
    createdAtLabel:
      row.createdAtLabel === null || row.createdAtLabel === undefined
        ? null
        : String(row.createdAtLabel),
    recipientCount: num(row.recipientCount),
    pendingCount: num(row.pendingCount),
    sentCount: num(row.sentCount),
    failedCount: num(row.failedCount),
    createdBy:
      row.createdBy === null || row.createdBy === undefined
        ? null
        : String(row.createdBy),
  };
}

/** Admin: the announcement table, newest first. */
export async function listAnnouncements(): Promise<AdminAnnouncementRow[]> {
  const out = await api<{ announcements?: Record<string, unknown>[] }>(
    "/admin/api/announcements",
    { realm: "admin" },
  );
  return (out.announcements ?? []).map(asAdminRow);
}