import Link from "next/link";
import { LuArrowRight, LuCircleCheck } from "react-icons/lu";
import type { DashboardSession } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { evidenceLabel } from "@/lib/evidence-display";
import {
  sessionActionLabel,
  sessionItemHref,
  sessionKindLabel,
} from "@/lib/session-links";

type Subjects = Record<string, { slug: string; name: string; code: string }>;

const KIND_VARIANT = {
  RETRIEVE: "amber",
  PRACTICE: "blue",
  CONTINUE: "green",
  LEARN: "purple",
  MOCK: "neutral",
  PAST: "neutral",
} as const;

export function TodaysSession({
  session,
  subjects,
}: {
  session: DashboardSession;
  subjects: Subjects;
}) {
  if (session.items.length === 0) {
    return (
      <div className="card p-4 text-sm text-muted">
        Nothing urgent today — pick any subject below and keep your streak going.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted">
        {session.done} of {session.total} done · about {session.minutes} min
      </p>
      <ol className="space-y-3">
        {session.items.map((item, index) => {
          const subject = item.subjectId ? subjects[item.subjectId] : undefined;
          const href = item.doneAt ? null : sessionItemHref(item, subjects);
          const evidence =
            item.topicId == null
              ? null
              : (evidenceLabel(item) ??
                (item.evidenceLevel === "ENOUGH" && item.mastery != null
                  ? `${item.mastery}% mastery`
                  : null));
          return (
            <li
              key={item.id}
              className={cn("card flex items-center gap-3 p-4", item.doneAt && "opacity-60")}
            >
              <span
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                  item.doneAt
                    ? "bg-success-soft text-success"
                    : "bg-primary-soft text-primary",
                )}
              >
                {item.doneAt ? <LuCircleCheck className="h-5 w-5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant={KIND_VARIANT[item.kind]}>{sessionKindLabel(item)}</Badge>
                  {subject && (
                    <span className="text-xs font-medium text-muted">
                      {subject.code} · {subject.name}
                    </span>
                  )}
                  <span className="text-xs text-muted">{item.minutes} min</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {item.reason}
                  {evidence ? ` · ${evidence}` : ""}
                </p>
              </div>
              {href && (
                <Link
                  href={href}
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {sessionActionLabel(item)}
                  <LuArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
