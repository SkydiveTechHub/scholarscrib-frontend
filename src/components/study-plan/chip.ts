import { cn } from "@/lib/utils";

/** The pill used for single choices in the plan setup (class, term, subject, day). */
export function chip(selected: boolean) {
  return cn(
    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
    selected
      ? "border-primary bg-primary text-primary-foreground shadow-soft"
      : "border-border bg-card text-muted hover:border-primary/30",
  );
}
