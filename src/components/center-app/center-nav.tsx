"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useTutorCenters } from "@/hooks/api/use-center";
import { cn } from "@/lib/utils";
import {
  centerNavGroups,
  mobileBarItems,
} from "@/lib/center-nav";
import { isCenterOwnerRole } from "@/lib/center-subjects";

export function CenterNav({ variant }: { variant: "sidebar" | "mobile" }) {
  const pathname = usePathname();
  const centersQuery = useTutorCenters();

  // Same signal as the student MobileNav: lift the Tawk bubble above this bar.
  useEffect(() => {
    if (variant !== "mobile") return;
    document.documentElement.setAttribute("data-mobile-nav", "on");
    window.dispatchEvent(new Event("tawk:layout"));
    return () => {
      document.documentElement.removeAttribute("data-mobile-nav");
      window.dispatchEvent(new Event("tawk:layout"));
    };
  }, [variant]);

  const includeOwnerOnly = useMemo(() => {
    const centers = centersQuery.data?.centers ?? [];
    if (!centers.length) return true; // Owner onboarding / empty — keep Billing visible.
    return centers.some((c) => isCenterOwnerRole(c.staffRole));
  }, [centersQuery.data?.centers]);

  const navOpts = { includeOwnerOnly };

  // Exact match for leaf routes; Assignments/Students own nested paths.
  const isActive = (href: string) =>
    pathname === href ||
    (href === "/center/assignments" &&
      pathname.startsWith("/center/assignments/")) ||
    (href === "/center/students" &&
      pathname.startsWith("/center/students/")) ||
    (href === "/center/astra" && pathname.startsWith("/center/astra")) ||
    (href === "/center/team" && pathname.startsWith("/center/team")) ||
    (href === "/center/settings" && pathname.startsWith("/center/settings"));

  if (variant === "mobile") {
    return (
      <nav
        aria-label="Center"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch px-2 py-1.5">
          {mobileBarItems(navOpts).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                isActive(item.href) ? "text-primary" : "text-muted",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Center" className="space-y-5 p-3">
      {centerNavGroups(navOpts).map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  isActive(item.href)
                    ? "bg-secondary text-foreground"
                    : "text-muted hover:bg-secondary hover:text-foreground",
                )}
              >
                {isActive(item.href) && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                )}
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
