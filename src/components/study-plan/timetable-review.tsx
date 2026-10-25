"use client";

import { LuCircleAlert, LuTriangleAlert } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ACTIVITY_LABELS } from "@/lib/study-plan-display";
import {
  groupUnmet,
  minutesLabel,
  unmetExplanation,
  type PlanPreview,
  type PreviewWindowItem,
} from "@/lib/study-timetable";

type SubjectName = { id: string; name: string };

const TONE: Record<string, "blue" | "green" | "purple" | "amber" | "red"> = {
  LESSON: "blue",
  PRACTICE: "green",
  REVISION: "purple",
  PAST_QUESTIONS: "amber",
  MOCK_EXAM: "red",
};

function dayTitle(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

function groupByDate(items: PreviewWindowItem[]): { date: string; items: PreviewWindowItem[] }[] {
  const days = new Map<string, PreviewWindowItem[]>();
  for (const item of items) days.set(item.date, [...(days.get(item.date) ?? []), item]);
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({ date, items: rows }));
}

export type ReviewState =
  | { status: "loading" }
  | { status: "unsupported"; timetableInUse: boolean }
  | { status: "failed"; message: string }
  | { status: "ready"; preview: PlanPreview };

export function TimetableReview({
  state,
  subjects,
  onRetry,
  onFix,
  onUseSmart,
}: {
  state: ReviewState;
  subjects: SubjectName[];
  onRetry: () => void;
  /** Drops custom subjects and day times so the plan can be saved on an older server. */
  onUseSmart: () => void;
  /** Takes the student back to the step where a problem can be fixed. */
  onFix: () => void;
}) {
  const nameOf = (id: string) => subjects.find((s) => s.id === id)?.name ?? "A subject";

  if (state.status === "loading") {
    return <Spinner label="Checking your plan..." />;
  }

  if (state.status === "unsupported") {
    return (
      <div role="alert" className="rounded-xl border border-tone-amber-line bg-tone-amber-soft p-4 text-tone-amber-ink">
        <p className="flex items-center gap-2 text-sm font-bold">
          <LuTriangleAlert className="h-4 w-4" aria-hidden="true" />
          This server cannot check custom timetables yet
        </p>
        {state.timetableInUse ? (
          <>
            <p className="mt-2 text-sm">
              The planner service has not been updated to store custom subjects or day times, so saving now would
              drop them without telling you. Your choices are kept here, but this plan cannot be saved with them yet.
            </p>
            <p className="mt-1 text-sm">You can save with the smart timetable now and add custom subjects once the service is updated.</p>
            <button type="button" onClick={onUseSmart} className={buttonClass("outline", "sm", "mt-3")}>
              Use the smart timetable
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm">
            We could not preview your first two weeks, but a plan with the smart timetable can still be saved.
          </p>
        )}
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div role="alert" className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-danger">{state.message}</p>
        <p className="mt-1 text-xs text-muted">
          We could not check this plan just now. You can try again, or save and we will check it when it is saved.
        </p>
        <button type="button" onClick={onRetry} className={buttonClass("secondary", "sm", "mt-3")}>
          Try again
        </button>
      </div>
    );
  }

  const { preview } = state;

  if (!preview.valid) {
    return (
      <div role="alert" className="rounded-xl border border-tone-red-line bg-tone-red-soft p-4 text-tone-red-ink">
        <p className="flex items-center gap-2 text-sm font-bold">
          <LuCircleAlert className="h-4 w-4" aria-hidden="true" />
          This plan cannot be saved yet
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {preview.errors.map((error, i) => (
            <li key={`${error.code}-${i}`}>{error.message}</li>
          ))}
        </ul>
        <button type="button" onClick={onFix} className={buttonClass("outline", "sm", "mt-3")}>
          Go back and fix
        </button>
      </div>
    );
  }

  const { summary, window } = preview;
  const free = summary ? summary.weeklyAvailableMinutes - summary.weeklyAllocatedMinutes : 0;
  const unmet = window ? groupUnmet(window.unmet) : [];

  return (
    <div className="space-y-6">
      {preview.warnings.length > 0 && (
        <div role="status" className="space-y-2">
          {preview.warnings.map((warning, i) => (
            <p
              key={`${warning.code}-${i}`}
              className="flex items-start gap-2 rounded-xl border border-tone-amber-line bg-tone-amber-soft px-4 py-3 text-sm text-tone-amber-ink"
            >
              <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{warning.subjectId ? `${nameOf(warning.subjectId)}: ` : ""}{warning.message}</span>
            </p>
          ))}
        </div>
      )}

      {summary && (
        <section aria-labelledby="week-summary">
          <h3 id="week-summary" className="text-sm font-bold text-foreground">Your week</h3>
          <p className="mt-1 text-sm text-muted">
            {minutesLabel(summary.weeklyAvailableMinutes)} of study time
            {summary.mode === "CUSTOM" && (
              <>
                {"; "}
                {minutesLabel(summary.weeklyAllocatedMinutes)} given to the subjects you chose and {minutesLabel(free)} left for
                whatever needs attention most
              </>
            )}
            .
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {summary.days.map((day) => (
              <li key={day.day} className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{day.name}</span>
                  <span className="text-xs text-muted">{minutesLabel(day.availableMinutes)}</span>
                </div>
                {day.subjects.length > 0 ? (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {day.subjects.map((subject) => (
                      <li key={subject.subjectId}>
                        <Badge variant={subject.strength === "PINNED" ? "primary" : "neutral"}>
                          {nameOf(subject.subjectId)} · {minutesLabel(subject.minutes)}
                          {subject.strength === "PINNED" ? " · pinned" : ""}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    {summary.mode === "CUSTOM" ? "Open day: we choose." : "We choose the subjects."}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {summary.restDays.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Rest days: {summary.restDays.map((day) => day.name).join(", ")}.
            </p>
          )}
          {summary.mode === "CUSTOM" && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {summary.coverage.map((row) => (
                <li key={row.subjectId}>
                  <span className="font-semibold text-foreground">{nameOf(row.subjectId)}</span>
                  {row.daysPerWeek === 0
                    ? ": not on your timetable, so it gets leftover time."
                    : `: ${row.daysPerWeek} ${row.daysPerWeek === 1 ? "day" : "days"} a week, ${minutesLabel(row.minutesPerWeek)}${row.pinnedDays ? `, ${row.pinnedDays} pinned` : ""}.`}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {unmet.length > 0 && (
        <section aria-labelledby="unmet" className="rounded-xl border border-tone-amber-line bg-tone-amber-soft px-4 py-3 text-tone-amber-ink">
          <h3 id="unmet" className="text-sm font-bold">Some of your timetable cannot be followed yet</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {unmet.map((group) => (
              <li key={`${group.subjectId}-${group.strength}-${group.reason}`}>
                <span className="font-semibold">
                  {nameOf(group.subjectId)}
                  {group.strength === "PINNED" ? " (pinned)" : ""}
                </span>
                {" on "}
                {group.dates.map(dayTitle).join(", ")}. {unmetExplanation(group.reason, group.strength)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {window?.overload && (
        <p role="status" className="rounded-xl border border-tone-amber-line bg-tone-amber-soft px-4 py-3 text-sm text-tone-amber-ink">
          At this pace you would be about {window.overload.topicsBehind}{" "}
          {window.overload.topicsBehind === 1 ? "topic" : "topics"} behind. Adding{" "}
          {window.overload.suggestedExtraMinutesPerWeek} minutes a week, or one more study day, would help. You can still
          save this plan.
        </p>
      )}

      {window && (
        <section aria-labelledby="first-weeks">
          <h3 id="first-weeks" className="text-sm font-bold text-foreground">Your first two weeks</h3>
          <p className="mt-1 text-xs text-muted">
            A preview based on where you are today. The topics inside each session can change as you learn and as
            sessions are missed or finished.
          </p>
          {window.items.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing would be planned in these two weeks.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {groupByDate(window.items).map((day) => (
                <li key={day.date} className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                  <p className="text-xs font-bold text-foreground">{dayTitle(day.date)}</p>
                  <ul className="mt-1.5 space-y-1">
                    {day.items.map((item, i) => (
                      <li key={`${item.date}-${i}`} className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant={TONE[item.activityType] ?? "neutral"}>
                          {ACTIVITY_LABELS[item.activityType] ?? item.activityType}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {item.subjectName}
                          {item.topicTitle ? ` — ${item.topicTitle}` : ""}
                        </span>
                        <span className="text-xs text-muted">{item.durationMinutes} min</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
