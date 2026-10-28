import Link from "next/link";
import { LuArrowRight, LuCompass } from "react-icons/lu";
import type { NextMove } from "@/lib/next-move";

/**
 * The one emphasised action on the dashboard. Presentational: the choice is
 * made by `pickNextMove`, from today's session data.
 */
export function NextMoveCard({ move }: { move: NextMove }) {
  return (
    <section
      aria-labelledby="next-move-title"
      className="card flex flex-wrap items-center justify-between gap-4 p-5 ring-1 ring-primary/20"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <LuCompass className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {move.kind === "personalized" ? "Your next move" : "Suggested next step"}
          </p>
          <h2 id="next-move-title" className="text-base font-bold text-foreground">
            {move.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {move.reason}
            {move.minutes ? ` · about ${move.minutes} min` : ""}
          </p>
        </div>
      </div>
      <Link
        href={move.href}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {move.cta}
        <LuArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
