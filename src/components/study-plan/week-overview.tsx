import { cn } from "@/lib/utils";
import { weekOverview } from "@/lib/study-plan-display";
import type { StudyPlanData } from "@/lib/study-plan";
import { minutesLabel } from "@/lib/study-timetable";

/**
 * Monday to Sunday at a glance: what is planned each day, how much is done, and
 * which days are rest days. The detailed list below it is the same sessions.
 */
export function WeekOverview({ plan, today }: { plan: StudyPlanData; today: string }) {
  const days = weekOverview(plan.items, plan.studyDays, today);
  return (
    <section aria-labelledby="week-at-a-glance" className="card p-5">
      <h2 id="week-at-a-glance" className="text-lg font-bold tracking-tight text-foreground">
        This week at a glance
      </h2>
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => (
          <li
            key={day.date}
            aria-current={day.isToday ? "date" : undefined}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              day.isToday ? "border-primary bg-primary-soft/50" : "border-border bg-secondary/30",
              day.isRest && "opacity-70",
            )}
          >
            <p className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>{day.short}</span>
              {day.isToday && <span className="text-primary">Today</span>}
            </p>
            {day.isRest ? (
              <p className="mt-1 text-xs text-muted">Rest day</p>
            ) : day.planned === 0 ? (
              <p className="mt-1 text-xs text-muted">Nothing planned</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-foreground">
                  {day.planned} {day.planned === 1 ? "session" : "sessions"} · {minutesLabel(day.minutes)}
                </p>
                <p className="text-xs text-muted">
                  {day.done} of {day.planned} done{day.missed > 0 ? `, ${day.missed} missed` : ""}
                </p>
                <p className="mt-1 truncate text-xs text-muted">{day.subjects.join(", ")}</p>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
