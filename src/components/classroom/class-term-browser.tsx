"use client";

import { useState } from "react";
import Link from "next/link";
import { LuCircle, LuCircleCheck, LuCircleDot, LuListChecks } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { mockExamHrefFor } from "@/lib/classroom";
import { buttonClass } from "@/components/ui/button";
import { CLASS_LEVELS, TERMS, TERM_LABELS, type ClassLevel, type Term } from "@/lib/curriculum-scope";

// Classroom — class/term browser (spec Task 4). Replaces the accordion list
// slot on the subject page: a sticky class tab set plus the three terms for
// whichever class is selected, so a student lands on their own class with
// zero taps and can still page through the rest of the syllabus.

export type BrowserTopic = {
  slug: string;
  title: string;
  completed: boolean;
  /** Begun but not finished. */
  started: boolean;
  /** The topic to pick up next, so the row can say so. */
  isNext: boolean;
};

export type ClassGroup = {
  classLevel: string;
  terms: { term: string; topics: BrowserTopic[] }[];
};

function TopicStatusIcon({ topic }: { topic: BrowserTopic }) {
  if (topic.completed) {
    return <LuCircleCheck className="h-4 w-4 flex-shrink-0 text-tone-green-ink" aria-hidden />;
  }
  if (topic.started) {
    return <LuCircleDot className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden />;
  }
  return <LuCircle className="h-4 w-4 flex-shrink-0 text-muted/60" aria-hidden />;
}

export function ClassTermBrowser({
  subjectSlug,
  subjectId,
  classes,
  initialClassLevel,
}: {
  subjectSlug: string;
  /**
   * Plain id, not a prepared href. React cannot serialise a function across the
   * server/client boundary, so the practice link is built here instead.
   */
  subjectId: string;
  classes: ClassGroup[];
  initialClassLevel: ClassLevel;
}) {
  const [selectedClass, setSelectedClass] = useState<string>(initialClassLevel);

  const byLevel = new Map(classes.map((group) => [group.classLevel, group]));
  const current = byLevel.get(selectedClass);

  return (
    <div>
      {/* Class tabs and the class's practice link share the sticky bar, so
          practice is one tap away however far down the syllabus they are. */}
      <div className="sticky top-14 sticky-chrome -mx-4 px-4 pb-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 rounded-xl border border-border bg-card p-1"
            role="group"
            aria-label="Class level"
          >
            {CLASS_LEVELS.map((level) => {
              const group = byLevel.get(level);
              const hasTopics = (group?.terms.flatMap((t) => t.topics).length ?? 0) > 0;
              const selected = selectedClass === level;

              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={selected}
                  disabled={!hasTopics}
                  title={hasTopics ? undefined : `No ${level} topics yet`}
                  onClick={() => setSelectedClass(level)}
                  className={cn(
                    "h-9 flex-1 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    selected
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted hover:text-foreground",
                    !hasTopics && "cursor-not-allowed opacity-40 hover:text-muted",
                  )}
                >
                  {level}
                </button>
              );
            })}
          </div>

          <Link
            href={mockExamHrefFor({ subjectId, classLevel: selectedClass as ClassLevel })}
            className={buttonClass("outline", "lg", "flex-shrink-0")}
          >
            <LuListChecks className="h-4 w-4" aria-hidden />
            <span>
              Practice<span className="hidden sm:inline"> {selectedClass}</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {TERMS.map((term: Term) => {
          const topics = current?.terms.find((t) => t.term === term)?.topics ?? [];
          const done = topics.filter((t) => t.completed).length;

          return (
            <div key={term} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="section-label mb-0">{TERM_LABELS[term]}</h3>
                {topics.length > 0 && (
                  <span className="text-xs font-semibold text-muted">
                    {done}/{topics.length} done
                  </span>
                )}
              </div>

              {topics.length === 0 ? (
                <p className="text-sm text-muted">No topics yet</p>
              ) : (
                <div className="space-y-2">
                  {topics.map((topic) => (
                    <Link
                      key={topic.slug}
                      href={`/classroom/${subjectSlug}/${topic.slug}`}
                      className={cn(
                        "group/topic flex min-h-11 items-center justify-between gap-3 rounded-xl border p-3 transition-all hover:border-primary/40 hover:shadow-soft",
                        topic.isNext
                          ? "border-primary/50 bg-primary-soft/60"
                          : "border-border",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <TopicStatusIcon topic={topic} />
                        <span className="truncate text-sm font-medium text-foreground">
                          {topic.title}
                        </span>
                      </div>
                      {/* Words as well as icons, so status never rests on colour alone. */}
                      {topic.isNext ? (
                        <span className="flex-shrink-0 text-xs font-bold text-primary">
                          {topic.started ? "Continue" : "Up next"}
                        </span>
                      ) : topic.completed ? (
                        <span className="sr-only">Completed</span>
                      ) : topic.started ? (
                        <span className="flex-shrink-0 text-xs font-semibold text-muted">
                          In progress
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
