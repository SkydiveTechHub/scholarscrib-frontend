import { LuPin } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import type { StudyPlanData, StudyPlanSubject } from "@/lib/study-plan";
import {
  DAY_NAMES,
  WEEKDAYS,
  minutesLabel,
  reservedMinutes,
} from "@/lib/study-timetable";

export type EditStep = "basics" | "availability" | "timetable";

/**
 * What the student asked for, kept apart from the sessions generated from it.
 * This is the recurring preference; the schedule below changes as they learn.
 */
export function TimetableSummary({
  plan,
  subjects,
  onEdit,
}: {
  plan: StudyPlanData;
  subjects: StudyPlanSubject[];
  onEdit: (step: EditStep) => void;
}) {
  const names = Object.fromEntries(subjects.map((s) => [s.id, s.code || s.name]));
  const timetable = plan.timetable;
  const custom = timetable?.mode === "CUSTOM";
  const overrides = Object.fromEntries((timetable?.dayMinutes ?? []).map((row) => [row.day, row.minutes]));

  return (
    <section aria-labelledby="your-timetable" className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id="your-timetable" className="text-lg font-bold tracking-tight text-foreground">
            Your timetable
          </h2>
          <Badge variant={custom ? "primary" : "neutral"}>{custom ? "Custom subjects" : "Smart"}</Badge>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onEdit("availability")} className={buttonClass("outline", "sm")}>
            Change study time
          </button>
          <button type="button" onClick={() => onEdit("timetable")} className={buttonClass("outline", "sm")}>
            {custom ? "Edit subjects" : "Choose subjects by day"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        {custom
          ? "These are the subjects you chose for each day. The topics and activities inside them are picked for you and appear in the sessions below."
          : "You choose when you study. We choose the subjects and topics each day."}
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {WEEKDAYS.map((day) => {
          const studying = plan.studyDays.includes(day);
          const rows = (timetable?.allocations ?? []).filter((a) => a.day === day);
          const minutes = overrides[day] ?? (day >= 6 ? plan.weekendMinutes : plan.weekdayMinutes);
          return (
            <li key={day} className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
              <p className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>{DAY_NAMES[day]}</span>
                <span className="font-normal text-muted">{studying ? minutesLabel(minutes) : "Rest day"}</span>
              </p>
              {studying && custom && (
                rows.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {rows.map((row) => (
                      <li key={row.subjectId} className="flex items-center gap-1.5 text-xs text-foreground">
                        {row.strength === "PINNED" && <LuPin className="h-3 w-3 text-primary" aria-hidden="true" />}
                        <span>
                          {names[row.subjectId] ?? "A subject"} · {minutesLabel(reservedMinutes(row))}
                          {row.strength === "PINNED" && <span className="sr-only"> (pinned)</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-muted">Open: we choose.</p>
                )
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
