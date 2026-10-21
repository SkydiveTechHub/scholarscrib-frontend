"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LuArrowLeft,
  LuBell,
  LuBookOpen,
  LuCheckCheck,
  LuFlame,
  LuMegaphone,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/api/use-notifications";
import type { NotificationItemOut } from "@/lib/api/types";
import {
  groupByDay,
  isUnread,
  kindOf,
  relativeTime,
  targetOf,
  type NotificationKind,
} from "@/lib/notifications";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExamActive } from "@/stores/exam-store";

const KIND_STYLE: Record<NotificationKind, { icon: IconType; tile: string; label: string }> = {
  announcement: {
    icon: LuMegaphone,
    tile: "bg-tone-blue-soft text-tone-blue-ink",
    label: "Announcement",
  },
  study: { icon: LuBookOpen, tile: "bg-tone-green-soft text-tone-green-ink", label: "Study reminder" },
  streak: { icon: LuFlame, tile: "bg-tone-orange-soft text-tone-orange-ink", label: "Streak" },
  other: { icon: LuBell, tile: "bg-tone-indigo-soft text-tone-indigo-ink", label: "Notification" },
};

function fullDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" });
}

/**
 * The inbox page: every notification on the left, the selected one expanded on
 * the right. The selection lives in `?id=` so refresh and back work. On a phone
 * only one pane shows at a time.
 */
export function NotificationsView() {
  const selectedId = useSearchParams().get("id");
  const examActive = useExamActive();
  const list = useNotifications(true);
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = useMemo(
    () => list.data?.pages.flatMap((page) => page.notifications) ?? [],
    [list.data],
  );
  const groups = useMemo(() => groupByDay(items, now), [items, now]);
  const selected = selectedId ? (items.find((item) => item.id === selectedId) ?? null) : null;

  // Opening a notification reads it, including when it arrives by link.
  const selectedUnread = selected ? isUnread(selected) : false;
  const { mutate: markOne } = markRead;
  useEffect(() => {
    if (selected && selectedUnread) markOne(selected.id);
  }, [selected, selectedUnread, markOne]);

  const prefetch = examActive ? false : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
      <section
        aria-label="All notifications"
        className={cn(
          "overflow-hidden rounded-2xl border border-border bg-card",
          selectedId && "hidden lg:block",
        )}
      >
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-foreground">All notifications</h2>
          {unread > 0 && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-soft-foreground">
              {unread} new
            </span>
          )}
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:text-muted disabled:opacity-60"
          >
            <LuCheckCheck className="h-4 w-4" aria-hidden />
            Mark all read
          </button>
        </header>

        <div aria-live="polite">
          {list.isPending ? (
            <ListSkeleton />
          ) : list.isError && items.length === 0 ? (
            <Message
              title="Couldn't load notifications"
              description="Check your connection and try again."
              action={
                <button
                  type="button"
                  onClick={() => void list.refetch()}
                  className="rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary-soft-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Try again
                </button>
              }
            />
          ) : items.length === 0 ? (
            <Message
              title="You're all caught up"
              description="Study reminders and announcements from ScholarsCrib will show up here."
            />
          ) : (
            <>
              {groups.map((group) => (
                <section key={group.label} aria-label={group.label}>
                  <h3 className="border-b border-border bg-secondary/40 px-4 py-1.5 text-xs font-bold text-muted">
                    {group.label}
                  </h3>
                  <ul className="divide-y divide-border">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <Row
                          item={item}
                          now={now}
                          active={item.id === selectedId}
                          prefetch={prefetch}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {list.hasNextPage && (
                <div className="border-t border-border p-2">
                  <button
                    type="button"
                    onClick={() => void list.fetchNextPage()}
                    disabled={list.isFetchingNextPage}
                    className="w-full rounded-lg py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
                  >
                    {list.isFetchingNextPage ? "Loading…" : "Show older"}
                  </button>
                </div>
              )}
              {list.isError && (
                <p role="alert" className="border-t border-border px-4 py-2 text-xs text-danger">
                  Couldn&apos;t refresh. Showing what we have.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section
        aria-label="Notification details"
        className={cn(
          "rounded-2xl border border-border bg-card lg:sticky lg:top-6",
          !selectedId && "hidden lg:block",
        )}
      >
        {selected ? (
          <Detail item={selected} prefetch={prefetch} />
        ) : selectedId && list.isPending ? (
          <ListSkeleton />
        ) : selectedId ? (
          <div className="p-4">
            <BackLink />
            <Message
              title="Notification not found"
              description={
                list.hasNextPage
                  ? "It may be older than what's loaded. Load older notifications to find it."
                  : "It may have been removed."
              }
              action={
                list.hasNextPage ? (
                  <button
                    type="button"
                    onClick={() => void list.fetchNextPage()}
                    disabled={list.isFetchingNextPage}
                    className={buttonClass("outline", "sm")}
                  >
                    {list.isFetchingNextPage ? "Loading…" : "Show older"}
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <Message
            title="Select a notification"
            description="Pick one from the list to read all of it here."
          />
        )}
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/notifications"
      className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
    >
      <LuArrowLeft className="h-4 w-4" aria-hidden />
      All notifications
    </Link>
  );
}

function Detail({ item, prefetch }: { item: NotificationItemOut; prefetch: boolean | undefined }) {
  const { icon: Icon, tile, label } = KIND_STYLE[kindOf(item.type)];
  const target = targetOf(item);
  const date = fullDate(item.createdAt);

  return (
    <article className="p-5 sm:p-6">
      <BackLink />
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", tile)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
          <h2 className="mt-0.5 break-words text-lg font-bold text-foreground">{item.title}</h2>
          {date && <p className="mt-0.5 text-xs text-muted">{date}</p>}
        </div>
      </div>
      <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
        {item.body}
      </p>
      {target && (
        <Link href={target} prefetch={prefetch} className={buttonClass("primary", "md", "mt-5")}>
          Open
        </Link>
      )}
    </article>
  );
}

function Row({
  item,
  now,
  active,
  prefetch,
}: {
  item: NotificationItemOut;
  now: Date;
  active: boolean;
  prefetch: boolean | undefined;
}) {
  const unread = isUnread(item);
  const { icon: Icon, tile } = KIND_STYLE[kindOf(item.type)];
  const time = relativeTime(item.createdAt, now);

  return (
    <Link
      href={`/notifications?id=${encodeURIComponent(item.id)}`}
      prefetch={prefetch}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
        unread && "bg-primary-soft/40",
        active && "bg-secondary",
      )}
    >
      <span className={cn("mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", tile)}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 break-words text-sm text-foreground",
              unread ? "font-bold" : "font-semibold",
            )}
          >
            {item.title}
          </span>
          <span className="flex flex-shrink-0 items-center gap-1.5 pt-0.5 text-xs text-muted">
            {time}
            {unread && (
              <>
                <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
                <span className="sr-only">Unread</span>
              </>
            )}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 break-words text-sm leading-snug text-muted">
          {item.body}
        </span>
      </span>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="divide-y divide-border">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="flex animate-pulse items-start gap-3 px-4 py-3 motion-reduce:animate-none">
          <div className="h-9 w-9 rounded-xl bg-secondary" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-2/5 rounded bg-secondary" />
            <div className="h-3 w-4/5 rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Message({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <LuBell className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 max-w-64 text-sm leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
