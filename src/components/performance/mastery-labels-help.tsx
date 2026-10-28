import { MASTERY_LABEL_HELP, MASTERY_RULE } from "@/lib/mastery-labels";

/** Collapsed by default so it never crowds the topic list. */
export function MasteryLabelsHelp() {
  return (
    <details className="card mb-3 p-4">
      <summary className="cursor-pointer text-xs font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        What do these labels mean?
      </summary>
      <dl className="mt-3 space-y-2 text-xs">
        {MASTERY_LABEL_HELP.map((row) => (
          <div key={row.label} className="flex flex-wrap gap-x-2">
            <dt className="font-bold text-foreground">{row.label}</dt>
            <dd className="text-muted">{row.meaning}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">{MASTERY_RULE}</p>
    </details>
  );
}
