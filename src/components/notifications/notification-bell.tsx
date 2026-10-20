"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuBell,
  LuBookOpen,
  LuCheckCheck,
  LuFlame,
  LuMegaphone,
  LuSettings,
  LuX,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/api/use-notifications";
import type { NotificationItemOut } from "@/lib/api/types";
import {
  badgeLabel,
  bellLabel,
  groupByDay,
  isUnread,
  kindOf,
  relativeTime,
  targetOf,
  type NotificationKind,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { useExamActive } from "@/stores/exam-store";

const KIND_STYLE: Record<NotificationKind, { icon: IconType; tile: string }> = {
  announcement: { icon: LuMegaphone, tile: "bg-tone-blue-soft text-tone-blue-ink" },
  study: { icon: LuBookOpen, tile: "bg-tone-green-soft text-tone-green-ink" },
  streak: { icon: LuFlame, tile: "bg-tone-orange-soft text-tone-orange-ink" },
  other: { icon: LuBell, tile: "bg-tone-indigo-soft text-tone-indigo-ink" },
};

const FLYOUT_GAP = 12;

/**
 * The inbox bell. `sidebar` is the desktop placement: the panel opens as a
 * flyout to the right of the rail. `header` is the phone placement: the panel
 * is a sheet pinned under the bar.
 *
 * The panel is portalled to <body>. The mobile header has `backdrop-blur`,
 * which makes it the containing block for `fixed` descendants and would clip
 * the sheet to the 56px bar (same trap the nav drawer's comment describes).
 */
export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  const { data: unread = 0 } = useUnreadCount();
  const label = badgeLabel(unread);

  // A push landing while the app is open (see public/sw.js) refreshes the
  // badge and any open list straight away.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== "NOTIFICATION_RECEIVED") return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient]);

  // Installed PWA: mirror the count on the home-screen icon. Silent where the
  // Badging API does not exist.
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    const run = unread > 0 ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.();
    run?.catch(() => undefined);
  }, [unread]);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Navigating anywhere closes the panel. Adjusted during render rather than in
  // an effect: https://react.dev/learn/you-might-not-need-an-effect
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Move focus into the panel so keyboard and screen-reader users land in it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={bellLabel(unread)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors",
          "hover:bg-secondary hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "bg-secondary text-foreground",
          className,
        )}
      >
        <LuBell className="h-[19px] w-[19px]" aria-hidden />
        {label && (
          // Keyed on the label so a new arrival replays the pop; the base state
          // is static, so nothing moves for a returning visitor.
          <span
            key={label}
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-danger-foreground ring-2 ring-card motion-reduce:animate-none"
          >
            {label}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <Panel
            id={panelId}
            panelRef={panelRef}
            anchor={buttonRef}
            unread={unread}
            onClose={() => close()}
          />,
          document.body,
        )}
    </>
  );
}

function Panel({
  id,
  panelRef,
  anchor,
  unread,
  onClose,
}: {
  id: string;
  panelRef: React.RefObject<HTMLDivElement | null>;
  anchor: React.RefObject<HTMLButtonElement | null>;
  unread: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const examActive = useExamActive();
  const list = useNotifications(true);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  // Flyout position, desktop only (phones use the full-width sheet in CSS).
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    function place() {
      const rect = anchor.current?.getBoundingClientRect();
      if (rect) setOrigin({ x: rect.right + FLYOUT_GAP, y: Math.max(8, rect.top) });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor]);

  // Relative times tick while the panel is open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Keep the page behind the phone sheet from scrolling.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const items = useMemo(
    () => list.data?.pages.flatMap((page) => page.notifications) ?? [],
    [list.data],
  );
  const groups = useMemo(() => groupByDay(items, now), [items, now]);

  function open(item: NotificationItemOut) {
    if (isUnread(item)) markRead.mutate(item.id);
    onClose();
    const target = targetOf(item);
    if (target) router.push(target);
  }

  const style = origin
    ? ({ "--flyout-x": `${origin.x}px`, "--flyout-y": `${origin.y}px` } as React.CSSProperties)
    : undefined;

  return (
    <>
      {/* Phone only: dims the page and takes the outside tap. */}
      <div aria-hidden className="fixed inset-0 z-[60] bg-black/40 animate-fade-in lg:hidden" />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-label="Notifications"
        tabIndex={-1}
        style={style}
        className={cn(
          "fixed z-[70] flex flex-col overflow-hidden border border-border bg-card shadow-lift outline-none",
          "animate-pop motion-reduce:animate-none",
          // Phone: a sheet under the 56px bar.
          "inset-x-3 top-16 max-h-[calc(100dvh-5.5rem)] rounded-2xl",
          // Desktop: a flyout beside the rail.
          "lg:inset-x-auto lg:left-(--flyout-x) lg:top-(--flyout-y) lg:w-[400px] lg:max-h-[min(36rem,calc(100dvh-2rem))] lg:origin-top-left",
        )}
      >
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-foreground">Notifications</h2>
          {unread > 0 && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-soft-foreground">
              {unread} new
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={unread === 0 || markAll.isPending}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:text-muted disabled:opacity-60"
            >
              <LuCheckCheck className="h-4 w-4" aria-hidden />
              Mark all read
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden"
            >
              <LuX className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
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
                  <h3 className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-1.5 text-xs font-bold text-muted backdrop-blur">
                    {group.label}
                  </h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <Row
                          item={item}
                          now={now}
                          prefetch={examActive ? false : undefined}
                          onOpen={() => open(item)}
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

        <footer className="border-t border-border p-1.5">
          <Link
            href="/settings"
            prefetch={examActive ? false : undefined}
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <LuSettings className="h-4 w-4" aria-hidden />
            Notification settings
          </Link>
        </footer>
      </div>
    </>
  );
}

function Row({
  item,
  now,
  prefetch,
  onOpen,
}: {
  item: NotificationItemOut;
  now: Date;
  prefetch: boolean | undefined;
  onOpen: () => void;
}) {
  const unread = isUnread(item);
  const { icon: Icon, tile } = KIND_STYLE[kindOf(item.type)];
  const target = targetOf(item);
  const time = relativeTime(item.createdAt, now);

  const content = (
    <>
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
    </>
  );

  const rowClass = cn(
    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
    "hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
    unread && "bg-primary-soft/40",
  );

  // A row with a destination is a real link, so open-in-new-tab and middle
  // click work; one without is a plain "mark as read" button.
  return target ? (
    <Link
      href={target}
      prefetch={prefetch}
      onClick={(event) => {
        // Let the browser handle modified clicks (new tab) untouched.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        onOpen();
      }}
      className={rowClass}
    >
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onOpen} className={rowClass}>
      {content}
    </button>
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
