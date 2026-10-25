"use client";

import { useState } from "react";
import { LuPin, LuPlus, LuTrash2 } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DAY_NAMES,
  SESSION_MINUTES,
  WEEKDAYS,
  addAllocation,
  allocationsOn,
  dayCapacity,
  generalIssues,
  issuesOnDay,
  minutesLabel,
  nextSubjectFor,
  removeAllocation,
  reservedMinutes,
  updateAllocation,
  type Allocation,
  type PlanHours,
  type Strength,
  type TimetableDraft,
  type TimetableIssue,
  type TimetableMode,
} from "@/lib/study-timetable";

type SubjectOption = { id: string; name: string; code: string };

const MODES: { value: TimetableMode; title: string; body: string }[] = [
  {
    value: "SMART",
    title: "Smart timetable",
    body: "You choose the days and time. We choose the subjects and topics each day. This is the default.",
  },
  {
    value: "CUSTOM",
    title: "Custom subjects",
    body: "You choose which subjects go on which days, such as the ones your school teaches that day. We still pick the topics.",
  },
];

const STRENGTHS: { value: Strength; label: string }[] = [
  { value: "PREFERRED", label: "Preferred" },
  { value: "PINNED", label: "Pinned" },
];

/** 30-minute steps up to the day's room, always including what is already set. */
function timeOptions(capacity: number, current: number | null): number[] {
  const top = Math.max(capacity, current ?? 0, SESSION_MINUTES * 2);
  const options: number[] = [];
  for (let minutes = SESSION_MINUTES * 2; minutes <= top; minutes += SESSION_MINUTES) options.push(minutes);
  if (current !== null && current > SESSION_MINUTES && !options.includes(current)) options.push(current);
  return options.sort((a, b) => a - b);
}

function selectClass() {
  return "input h-10 py-0 text-sm";
}

function AllocationRow({
  allocation,
  index,
  draft,
  hours,
  subjects,
  moveTargets,
  confirming,
  onConfirm,
  onChange,
}: {
  allocation: Allocation;
  index: number;
  draft: TimetableDraft;
  hours: PlanHours;
  subjects: SubjectOption[];
  moveTargets: number[];
  confirming: boolean;
  onConfirm: (index: number | null) => void;
  onChange: (draft: TimetableDraft) => void;
}) {
  const day = DAY_NAMES[allocation.day];
  const taken = new Set(allocationsOn(draft, allocation.day).map((row) => row.allocation.subjectId));
  const capacity = dayCapacity(allocation.day, draft, hours);
  const minutes = allocation.minutes === SESSION_MINUTES ? null : allocation.minutes;
  const subjectName = subjects.find((s) => s.id === allocation.subjectId)?.name ?? "Unknown subject";
  const pinned = allocation.strength === "PINNED";

  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-3",
        pinned ? "border-primary/40 bg-primary-soft/50" : "border-border bg-secondary/30",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-foreground">{subjectName}</p>
        <div className="flex shrink-0 items-center gap-2">
          {pinned && (
            <Badge variant="primary">
              <LuPin className="h-3 w-3" aria-hidden="true" />
              Pinned
            </Badge>
          )}
          <span className="text-xs text-muted">{minutesLabel(reservedMinutes(allocation))}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="sr-only">Subject on {day}</span>
          <select
            className={selectClass()}
            value={allocation.subjectId}
            onChange={(e) => onChange(updateAllocation(draft, index, { subjectId: e.target.value }))}
          >
            {subjects.map((subject) => (
              <option
                key={subject.id}
                value={subject.id}
                disabled={subject.id !== allocation.subjectId && taken.has(subject.id)}
              >
                {subject.name}
              </option>
            ))}
            {!subjects.some((s) => s.id === allocation.subjectId) && (
              <option value={allocation.subjectId}>Unknown subject</option>
            )}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Time for {subjectName} on {day}</span>
          <select
            className={selectClass()}
            value={minutes ?? ""}
            onChange={(e) =>
              onChange(updateAllocation(draft, index, { minutes: e.target.value === "" ? null : Number(e.target.value) }))
            }
          >
            <option value="">One session (30 min)</option>
            {timeOptions(capacity, minutes).map((option) => (
              <option key={option} value={option}>{minutesLabel(option)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">How firm {subjectName} on {day} is</span>
          <select
            className={selectClass()}
            value={allocation.strength}
            onChange={(e) => onChange(updateAllocation(draft, index, { strength: e.target.value as Strength }))}
          >
            {STRENGTHS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.value === "PINNED" ? " (keep this slot)" : " (can move)"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {moveTargets.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Move to</span>
            <select
              className="input h-8 w-auto py-0 text-xs"
              aria-label={`Move ${subjectName} from ${day} to another day`}
              value=""
              onChange={(e) => {
                if (e.target.value) onChange(updateAllocation(draft, index, { day: Number(e.target.value) }));
              }}
            >
              <option value="">Choose a day</option>
              {moveTargets.map((target) => (
                <option
                  key={target}
                  value={target}
                  disabled={allocationsOn(draft, target).some((row) => row.allocation.subjectId === allocation.subjectId)}
                >
                  {DAY_NAMES[target]}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="ml-auto flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs font-semibold text-foreground">Remove {subjectName} from {day}?</span>
              <button
                type="button"
                onClick={() => {
                  onChange(removeAllocation(draft, index));
                  onConfirm(null);
                }}
                className={buttonClass("danger", "sm")}
              >
                Yes, remove
              </button>
              <button type="button" onClick={() => onConfirm(null)} className={buttonClass("secondary", "sm")}>
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onConfirm(index)}
              className={buttonClass("ghost", "sm", "text-danger")}
              aria-label={`Remove ${subjectName} from ${day}`}
            >
              <LuTrash2 className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * The weekly timetable. Subjects here are the student's own choice of what to
 * study on a day; the topics and activities inside each session are still
 * chosen by the planner and appear in the plan, not here.
 */
export function TimetableEditor({
  draft,
  hours,
  subjects,
  issues,
  onChange,
}: {
  draft: TimetableDraft;
  hours: PlanHours;
  subjects: SubjectOption[];
  issues: TimetableIssue[];
  onChange: (draft: TimetableDraft) => void;
}) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const subjectIds = subjects.map((s) => s.id);
  const general = generalIssues(issues);

  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label="How to plan your subjects" className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {MODES.map((mode) => {
          const selected = draft.mode === mode.value;
          return (
            <label
              key={mode.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-primary/60",
                selected ? "border-primary bg-primary-soft/50" : "border-border bg-card hover:border-primary/30",
              )}
            >
              <input
                type="radio"
                name="timetable-mode"
                className="mt-1"
                checked={selected}
                onChange={() => {
                  setConfirming(null);
                  onChange({ ...draft, mode: mode.value });
                }}
              />
              <span>
                <span className="block text-sm font-bold text-foreground">{mode.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{mode.body}</span>
              </span>
            </label>
          );
        })}
      </div>

      {draft.mode === "SMART" && draft.allocations.length > 0 && (
        <p role="status" className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
          Your custom subjects are saved here but not used while the smart timetable is selected.
        </p>
      )}

      {draft.mode === "CUSTOM" && (
        <>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted">
            <p className="font-semibold text-foreground">How this works</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>You pick the subject and the day. We pick the topic, such as a lesson or a revision, inside it.</li>
              <li><span className="font-semibold">Preferred:</span> we try this subject on this day, and may move it if there is nothing ready to study.</li>
              <li><span className="font-semibold">Pinned:</span> this slot stays for this subject. If nothing is ready, we leave it empty and tell you.</li>
              <li>Subjects you do not place only get the time that is left over.</li>
            </ul>
          </div>

          {general.map((problem) => (
            <p key={problem.message} role="alert" className="text-sm text-danger">{problem.message}</p>
          ))}

          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {WEEKDAYS.map((day) => {
              const studying = hours.studyDays.includes(day);
              const rows = allocationsOn(draft, day);
              const booked = rows.reduce((sum, row) => sum + reservedMinutes(row.allocation), 0);
              const capacity = dayCapacity(day, draft, hours);
              const problems = issuesOnDay(issues, day);
              const next = nextSubjectFor(draft, day, subjectIds);
              const moveTargets = hours.studyDays.filter((d) => d !== day).sort((a, b) => a - b);
              return (
                <li key={day} className={cn("card p-4", !studying && rows.length === 0 && "opacity-70")}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">{DAY_NAMES[day]}</h3>
                    {studying ? (
                      <span className="text-xs text-muted">
                        {minutesLabel(booked)} of {minutesLabel(capacity)} given to subjects
                      </span>
                    ) : (
                      <Badge variant="neutral">Rest day</Badge>
                    )}
                  </div>

                  {!studying && rows.length === 0 && (
                    <p className="text-xs text-muted">Nothing is planned on a rest day. Turn it on under study days to use it.</p>
                  )}

                  {rows.length > 0 && (
                    <ul className="space-y-2">
                      {rows.map(({ allocation, index }) => (
                        <AllocationRow
                          key={`${allocation.day}-${allocation.subjectId}-${index}`}
                          allocation={allocation}
                          index={index}
                          draft={draft}
                          hours={hours}
                          subjects={subjects}
                          moveTargets={moveTargets}
                          confirming={confirming === index}
                          onConfirm={setConfirming}
                          onChange={onChange}
                        />
                      ))}
                    </ul>
                  )}

                  {problems.map((problem, i) => (
                    <p key={problem.message} role="alert" className={cn("text-xs text-danger", i === 0 ? "mt-2" : "mt-1")}>
                      {problem.message}
                    </p>
                  ))}

                  {studying && (
                    <button
                      type="button"
                      disabled={next === null}
                      onClick={() =>
                        next &&
                        onChange(addAllocation(draft, { day, subjectId: next, minutes: null, strength: "PREFERRED" }))
                      }
                      className={buttonClass("outline", "sm", "mt-3")}
                      aria-label={`Add a subject to ${DAY_NAMES[day]}`}
                    >
                      <LuPlus className="h-4 w-4" aria-hidden="true" />
                      Add subject
                    </button>
                  )}
                  {studying && next === null && rows.length > 0 && (
                    <p className="mt-2 text-xs text-muted">Every subject in your plan is already on this day.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
