"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuSettings } from "react-icons/lu";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isCenterOwnerRole } from "@/lib/center-subjects";
import { cn } from "@/lib/utils";

/**
 * Gear that opens center profile settings for the active center.
 * Owner-only — facilitators do not get an edit control.
 */
export function CenterSettingsLink({
  className,
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const { center, centerId, centersQuery } = useActiveCenter();

  if (centersQuery.isLoading || !center || !centerId) return null;
  if (!isCenterOwnerRole(center.staffRole)) return null;

  const href = `/center/settings?centerId=${encodeURIComponent(centerId)}`;
  const active = pathname.startsWith("/center/settings");

  return (
    <Link
      href={href}
      aria-label={`Edit ${center.name} settings`}
      title="Edit center"
      className={cn(
        "inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors",
        "hover:bg-secondary hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active && "border-primary/40 bg-primary-soft text-primary",
        className,
      )}
    >
      <LuSettings className="h-4 w-4" />
    </Link>
  );
}
