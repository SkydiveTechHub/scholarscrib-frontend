// Presentation rules for the notification inbox. Pure, so they run under
// node:test without a DOM (scripts/test-notifications.mts).

import type { NotificationItemOut } from "@/lib/api/types";
import { isInternalPath } from "@/lib/push-payload";

/** Beyond this the badge says "9+" rather than growing the pill. */
export const BADGE_MAX = 9;

export function badgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > BADGE_MAX ? `${BADGE_MAX}+` : String(Math.floor(count));
}

/** Screen-reader name for the bell button, which carries the count. */
export function bellLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "Notifications";
  return `Notifications, ${Math.floor(count)} unread`;
}

export function isUnread(item: Pick<NotificationItemOut, "readAt">): boolean {
  return !item.readAt;
}

/** "now", "5m", "3h", "2d", then a short date. Never negative. */
export function relativeTime(iso: string | null | undefined, now: Date): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return then.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export type NotificationGroup = {
  label: "Today" | "Yesterday" | "Earlier";
  items: NotificationItemOut[];
};

function dayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Buckets by the viewer's local calendar day, keeping the server's order. */
export function groupByDay(
  items: readonly NotificationItemOut[],
  now: Date,
): NotificationGroup[] {
  const today = dayStart(now);
  const yesterday = dayStart(new Date(today - 12 * 60 * 60 * 1000));
  const buckets: Record<NotificationGroup["label"], NotificationItemOut[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const item of items) {
    const created = item.createdAt ? new Date(item.createdAt) : null;
    const start = created && !Number.isNaN(created.getTime()) ? dayStart(created) : 0;
    const label = start >= today ? "Today" : start >= yesterday ? "Yesterday" : "Earlier";
    buckets[label].push(item);
  }
  return (["Today", "Yesterday", "Earlier"] as const)
    .filter((label) => buckets[label].length > 0)
    .map((label) => ({ label, items: buckets[label] }));
}

/** Where tapping a notification goes; null when it should not navigate. */
export function targetOf(item: Pick<NotificationItemOut, "url">): string | null {
  return isInternalPath(item.url) ? item.url : null;
}

export type NotificationKind = "announcement" | "study" | "streak" | "other";

export function kindOf(type: string): NotificationKind {
  switch (type) {
    case "ANNOUNCEMENT":
      return "announcement";
    case "MORNING":
      return "study";
    case "STREAK":
      return "streak";
    default:
      return "other";
  }
}
