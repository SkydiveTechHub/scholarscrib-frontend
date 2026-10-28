import { LuFlame } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { calendarGrid, type StreakInfo } from "@/lib/gamification";

const WEEKS = 12;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Presentational. A study day is a day with real learning, not an app open. */
export function StreakCalendar({ streak }: { streak: StreakInfo }) {
  const grid = calendarGrid(streak.days, streak.today, WEEKS);
  const studiedCount = streak.days.length;

  return (
    <section aria-labelledby="streak-title" className="card mb-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-tone-orange-soft text-tone-orange-ink">
            <LuFlame className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p id="streak-title" className="text-sm font-bold text-foreground">
              {streak.currentStreak > 0
                ? `${streak.currentStreak}-day streak`
                : "Start a new streak today"}
            </p>
            <p className="text-xs text-muted">
              Best: {streak.longestStreak} day{streak.longestStreak === 1 ? "" : "s"} ·
              A study day means finishing a practice attempt or reviewing 5+ flashcards.
            </p>
          </div>
        </div>
      </div>

      <div
        role="img"
        aria-label={`Study calendar: you studied on ${studiedCount} of the last ${WEEKS * 7} days.`}
        className="mt-4 flex gap-1.5 overflow-x-auto pb-1"
      >
        <div className="flex flex-col gap-1 pr-1 text-[10px] text-muted" aria-hidden="true">
          {WEEKDAYS.map((d, i) => (
            <span key={d} className="flex h-4 items-center">
              {i % 2 === 0 ? d : ""}
            </span>
          ))}
        </div>
        {grid.map((column, w) => (
          <div key={w} className="flex flex-col gap-1">
            {column.map((cell) =>
              cell.future || !cell.inRange ? (
                <span key={cell.date} className="h-4 w-4" aria-hidden="true" />
              ) : (
                <span
                  key={cell.date}
                  title={`${cell.date}${cell.studied ? " — studied" : ""}`}
                  className={cn(
                    "h-4 w-4 rounded-[4px] border",
                    cell.studied
                      ? "border-success bg-success"
                      : "border-border bg-transparent",
                    cell.isToday && "ring-2 ring-primary ring-offset-1",
                  )}
                />
              ),
            )}
          </div>
        ))}
      </div>

      <p className="mt-2 flex items-center gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-[3px] border border-success bg-success" aria-hidden="true" />
          Studied
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-[3px] border border-border" aria-hidden="true" />
          No study
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-[3px] border border-border ring-2 ring-primary" aria-hidden="true" />
          Today
        </span>
      </p>
    </section>
  );
}
