import { cn } from "@/lib/utils";

/** Placeholder empty state for M0 shell pages before M1+ screens land. */
export function CenterEmptyState({
  title,
  message,
  className,
}: {
  title: string;
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border-strong bg-card px-4 py-10 text-center",
        className,
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {message && (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{message}</p>
      )}
    </div>
  );
}
