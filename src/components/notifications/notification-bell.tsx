"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { LuBell } from "react-icons/lu";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { useUnreadCount } from "@/hooks/api/use-notifications";
import { badgeLabel, bellLabel } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { useExamActive } from "@/stores/exam-store";

/**
 * The inbox bell: a link to the notifications page that carries the unread
 * badge. It also keeps the badge fresh (push messages, the home-screen icon).
 */
export function NotificationBell({ className }: { className?: string }) {
  const pathname = usePathname();
  const examActive = useExamActive();
  const active = pathname === "/notifications" || pathname.startsWith("/notifications/");

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

  return (
    <Link
      href="/notifications"
      prefetch={examActive ? false : undefined}
      aria-label={bellLabel(unread)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors",
        "hover:bg-secondary hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active && "bg-secondary text-foreground",
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
    </Link>
  );
}
