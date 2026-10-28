import Link from "next/link";
import { LuArrowRight, LuCircleCheck, LuSparkles } from "react-icons/lu";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { questPercent, type DailyQuests } from "@/lib/gamification";

/** Presentational. Progress comes from the server's record of today's activity. */
export function DailyQuestsCard({ data }: { data: DailyQuests }) {
  const done = data.quests.filter((q) => q.complete).length;

  return (
    <section aria-labelledby="daily-quests-title" className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="daily-quests-title" className="text-sm font-bold text-foreground">
          Daily quests
        </h2>
        <span className="text-xs font-semibold text-muted">
          {done} of {data.quests.length} done
        </span>
      </div>

      <ul className="mt-3 space-y-3">
        {data.quests.map((quest) => (
          <li
            key={quest.id}
            className={cn(
              "rounded-xl border border-border p-3",
              quest.complete && "bg-success-soft",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {quest.complete && (
                    <LuCircleCheck className="h-4 w-4 text-success" aria-hidden="true" />
                  )}
                  {quest.title}
                  {quest.complete && <span className="sr-only"> (complete)</span>}
                </p>
                <p className="text-xs text-muted">{quest.description}</p>
              </div>
              {!quest.complete && (
                <Link
                  href={quest.href}
                  className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  Start
                  <LuArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only"> {quest.title}</span>
                </Link>
              )}
            </div>
            <Progress
              value={questPercent(quest.progress, quest.target)}
              tone={quest.complete ? "success" : "primary"}
              className="mt-2 h-1.5"
            />
            <p className="mt-1 text-[11px] font-medium text-muted">
              {quest.progress} / {quest.target}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <LuSparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {data.bonusAwarded
          ? `+${data.bonusXp} XP bonus earned for finishing today’s quests.`
          : `Finish all of them for a +${data.bonusXp} XP bonus. New quests tomorrow.`}
      </p>
    </section>
  );
}
