import { buttonClass } from "@/components/ui/button";

/** Shared card chrome for each independently-saved settings section. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Inline error for a section. Successes are toasts, so this never shows one. */
export function FormMessage({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-danger/20 bg-danger-soft p-3 text-sm text-danger"
    >
      {error}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-soft outline-none transition-all duration-150 placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/15";

export const labelClass = "mb-1.5 block text-sm font-semibold text-foreground";

export const submitClass = buttonClass("primary", "md");
