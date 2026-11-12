import { LuShare2 } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * S-2: visible indicator that this result is shared with a tutor/center.
 * Prefer BE `sharedWith.tutorName` / `sharedWith.centerName` when present.
 * Self-started practice must never show this.
 */
export function SharedWithBadge({
  tutorName,
  centerName,
  className,
}: {
  tutorName?: string | null;
  centerName?: string | null;
  className?: string;
}) {
  const tutor = (tutorName ?? "").trim();
  const center = (centerName ?? "").trim();
  const label =
    tutor && center
      ? `Shared with ${tutor}, ${center}`
      : tutor
        ? `Shared with ${tutor}`
        : center
          ? `Shared with ${center}`
          : "Shared with your tutor";

  return (
    <Badge variant="teal" className={cn("gap-1.5 font-semibold", className)}>
      <LuShare2 className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Badge>
  );
}
