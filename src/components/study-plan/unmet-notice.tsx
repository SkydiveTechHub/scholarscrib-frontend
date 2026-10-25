import { LuTriangleAlert } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import type { StudyPlanSubject } from "@/lib/study-plan";
import { groupUnmet, unmetExplanation, type UnmetAllocation } from "@/lib/study-timetable";
import type { EditStep } from "./timetable-summary";

function dayTitle(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

/**
 * Timetable sessions the planner could not give to their subject, in plain
 * words, with the ways the student can change that. Nothing here is an error:
 * the rest of the plan is fine, and nothing was invented to fill the gap.
 */
export function UnmetNotice({
  unmet,
  subjects,
  today,
  onEdit,
}: {
  unmet: UnmetAllocation[];
  subjects: StudyPlanSubject[];
  today: string;
  onEdit: (step: EditStep) => void;
}) {
  // Past days are history; the notice is about what is still ahead.
  const ahead = unmet.filter((row) => row.date >= today);
  if (ahead.length === 0) return null;
  const nameOf = (id: string) => subjects.find((s) => s.id === id)?.name ?? "A subject";

  return (
    <section
      role="status"
      aria-labelledby="unmet-title"
      className="rounded-xl border border-tone-amber-line bg-tone-amber-soft px-4 py-3 text-tone-amber-ink"
    >
      <h2 id="unmet-title" className="flex items-center gap-2 text-sm font-bold">
        <LuTriangleAlert className="h-4 w-4" aria-hidden="true" />
        Some of your timetable could not be followed
      </h2>
      <ul className="mt-2 space-y-2 text-sm">
        {groupUnmet(ahead).map((group) => (
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
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onEdit("timetable")} className={buttonClass("outline", "sm")}>
          Edit subjects
        </button>
        <button type="button" onClick={() => onEdit("availability")} className={buttonClass("outline", "sm")}>
          Add study time
        </button>
      </div>
    </section>
  );
}
