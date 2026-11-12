"use client";

import { useActiveCenter } from "@/hooks/use-active-center";
import { cn } from "@/lib/utils";

/**
 * Lets tutors with more than one center pick which roster / invites / etc.
 * they are managing. With `showFallback`, renders a static "Centers" title
 * when there is only one (or zero) center — useful in the mobile header.
 */
export function CenterSwitcher({
  className,
  compact = false,
  showFallback = false,
}: {
  className?: string;
  /** Tighter label for the mobile header. */
  compact?: boolean;
  /** When true, show "Centers" if a switcher is not needed. */
  showFallback?: boolean;
}) {
  const { centers, center, setActiveCenterId, hasMultiple, centersQuery } =
    useActiveCenter();

  if (centersQuery.isLoading || !hasMultiple || !center) {
    if (!showFallback) return null;
    return (
      <span
        className={cn(
          "truncate text-sm font-bold text-foreground",
          className,
        )}
      >
        Centers
      </span>
    );
  }

  return (
    <label
      className={cn(
        "flex min-w-0 flex-col gap-0.5",
        compact ? "max-w-[14rem]" : "w-full",
        className,
      )}
    >
      <span className="sr-only">Active center</span>
      {!compact && (
        <span className="px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Working in
        </span>
      )}
      <select
        value={center.id}
        onChange={(e) => setActiveCenterId(e.target.value)}
        className={cn(
          "w-full truncate rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-semibold text-foreground",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        )}
        aria-label="Active center"
      >
        {centers.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
    </label>
  );
}
