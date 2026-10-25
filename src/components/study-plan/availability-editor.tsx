"use client";

import { LuRotateCcw } from "react-icons/lu";
import {
  DAY_NAMES,
  DAY_SHORT,
  WEEKDAYS,
  dayMinutes,
  defaultMinutes,
  issuesOnDay,
  minutesLabel,
  setDayMinutes,
  type PlanHours,
  type TimetableDraft,
  type TimetableIssue,
} from "@/lib/study-timetable";
import { chip } from "./chip";
import { MinutesField } from "./minutes-field";

/**
 * Which days the student studies and for how long. Two defaults (a school day
 * and a weekend day) cover most weeks; any single day can differ.
 */
export function AvailabilityEditor({
  studyDays,
  weekdayMinutes,
  weekendMinutes,
  draft,
  issues,
  onToggleDay,
  onDefaults,
  onDraft,
}: {
  studyDays: number[];
  weekdayMinutes: number;
  weekendMinutes: number;
  draft: TimetableDraft;
  issues: TimetableIssue[];
  onToggleDay: (day: number) => void;
  onDefaults: (defaults: { weekdayMinutes?: number; weekendMinutes?: number }) => void;
  onDraft: (draft: TimetableDraft) => void;
}) {
  const hours: PlanHours = { studyDays, weekdayMinutes, weekendMinutes, subjectIds: [] };
  const chosen = WEEKDAYS.filter((day) => studyDays.includes(day));
  const weekTotal = chosen.reduce((sum, day) => sum + dayMinutes(day, draft, hours), 0);

  return (
    <div className="space-y-6">
      <div>
        <span className="label" id="study-days-label">Study days</span>
        <div role="group" aria-labelledby="study-days-label" className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={studyDays.includes(day)}
              aria-label={DAY_NAMES[day]}
              onClick={() => onToggleDay(day)}
              className={chip(studyDays.includes(day))}
            >
              {DAY_SHORT[day]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Days you leave out are rest days. Nothing is planned on them.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label>
          <span className="label">Usual minutes on a school day</span>
          <MinutesField
            key={`wk-${weekdayMinutes}`}
            label="Usual minutes on a school day"
            value={weekdayMinutes}
            max={480}
            onCommit={(minutes) => onDefaults({ weekdayMinutes: minutes })}
          />
        </label>
        <label>
          <span className="label">Usual minutes on a weekend day</span>
          <MinutesField
            key={`we-${weekendMinutes}`}
            label="Usual minutes on a weekend day"
            value={weekendMinutes}
            onCommit={(minutes) => onDefaults({ weekendMinutes: minutes })}
          />
        </label>
      </div>

      {chosen.length > 0 && (
        <fieldset>
          <legend className="label">Time on each day</legend>
          <p className="mb-3 text-xs text-muted">
            Change a day if it is different from usual. Time is planned in 30-minute sessions.
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {chosen.map((day) => {
              const minutes = dayMinutes(day, draft, hours);
              const custom = draft.dayMinutes[day] !== undefined;
              const problems = issuesOnDay(issues, day);
              const errorId = `day-${day}-minutes-error`;
              return (
                <li key={day} className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-sm font-semibold text-foreground">{DAY_NAMES[day]}</span>
                    <MinutesField
                      key={`${day}-${minutes}`}
                      label={`Minutes on ${DAY_NAMES[day]}`}
                      value={minutes}
                      describedBy={problems.length ? errorId : undefined}
                      invalid={problems.length > 0}
                      onCommit={(next) => onDraft(setDayMinutes(draft, day, next, hours))}
                    />
                    <span className="text-xs text-muted">{minutesLabel(minutes)}</span>
                    {custom && (
                      <button
                        type="button"
                        onClick={() => onDraft(setDayMinutes(draft, day, defaultMinutes(day, hours), hours))}
                        className="ml-auto rounded-lg p-1.5 text-muted hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        aria-label={`Use the usual time on ${DAY_NAMES[day]}`}
                        title="Use the usual time"
                      >
                        <LuRotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {problems.length > 0 && (
                    <div id={errorId} role="alert" className="mt-1.5 space-y-1 text-xs text-danger">
                      {problems.map((problem) => (
                        <p key={problem.message}>{problem.message}</p>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm font-semibold text-foreground">
            About {minutesLabel(weekTotal)} of study each week.
          </p>
        </fieldset>
      )}
    </div>
  );
}
