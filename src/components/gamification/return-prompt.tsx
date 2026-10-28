import Link from "next/link";
import { LuArrowRight, LuFlame } from "react-icons/lu";
import { returnPrompt, type StreakInfo } from "@/lib/gamification";

/** A gentle nudge to study today, or a small first step after time away. */
export function ReturnPrompt({ streak }: { streak: StreakInfo }) {
  const prompt = returnPrompt(streak);
  if (!prompt) return null;

  return (
    <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tone-orange-soft text-tone-orange-ink">
          <LuFlame className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">{prompt.title}</p>
          <p className="text-xs text-muted">{prompt.body}</p>
        </div>
      </div>
      <Link
        href={prompt.href}
        className="inline-flex items-center gap-1.5 rounded-xl border border-primary px-3.5 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary-soft"
      >
        {prompt.cta}
        <LuArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}
