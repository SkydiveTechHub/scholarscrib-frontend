"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowRight, LuBook, LuInbox, LuSearch, LuX } from "react-icons/lu";
import { TRACK_COLORS, TRACK_LABELS, type TrackCategory } from "@/lib/subjects";
import type { LibrarySubject } from "@/lib/library";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Subjects with something to read come first; the rest keep the server order. */
function withResourcesFirst(list: LibrarySubject[]): LibrarySubject[] {
  return [...list].sort(
    (a, b) => Number(b._count.resources > 0) - Number(a._count.resources > 0),
  );
}

/**
 * The subject shelf. It arrives from the server already filtered to the
 * student's track; each subject is a real link to /library/[slug], so Back,
 * refresh and sharing all work.
 */
export function LibraryShelf({ subjects }: { subjects: LibrarySubject[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const grouped = useMemo(() => {
    const matches = needle
      ? subjects.filter(
          (s) => s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle),
        )
      : subjects;
    const byCategory = new Map<string, LibrarySubject[]>();
    for (const subject of matches) {
      const list = byCategory.get(subject.trackCategory) ?? [];
      list.push(subject);
      byCategory.set(subject.trackCategory, list);
    }
    return Array.from(byCategory.entries()).map(
      ([category, list]) => [category, withResourcesFirst(list)] as const,
    );
  }, [subjects, needle]);

  const matchCount = grouped.reduce((total, [, list]) => total + list.length, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Library"
        description="Browse textbooks and study materials for your subjects."
      />

      {subjects.length === 0 ? (
        <EmptyState
          icon={<LuInbox className="h-6 w-6" />}
          title="No subjects available"
          description="Set your class and track in settings to see the subjects that fit you."
          action={
            <Link href="/settings?tab=study" className={buttonClass("primary", "md")}>
              Go to settings
            </Link>
          }
        />
      ) : (
        <>
          <div className="relative mb-6 max-w-md">
            <label htmlFor="library-search" className="sr-only">
              Search subjects
            </label>
            <LuSearch
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id="library-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subjects"
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground shadow-soft outline-none transition-all placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <LuX className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          <p className="sr-only" aria-live="polite">
            {needle ? `${matchCount} ${matchCount === 1 ? "subject" : "subjects"} found` : ""}
          </p>

          {matchCount === 0 ? (
            <EmptyState
              icon={<LuSearch className="h-6 w-6" />}
              title={`No subject matches “${query.trim()}”`}
              description="Check the spelling, or try a shorter name."
              action={
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={buttonClass("secondary", "md")}
                >
                  Clear search
                </button>
              }
            />
          ) : (
            grouped.map(([category, list]) => (
              <section key={category} className="mb-10" aria-label={`${TRACK_LABELS[category as TrackCategory] ?? category} subjects`}>
                <h2 className="section-label mb-4">
                  {TRACK_LABELS[category as TrackCategory] ?? category} Subjects
                  <span className="ml-2 font-semibold normal-case tracking-normal text-muted">
                    {list.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((subject) => {
                    const count = subject._count.resources;
                    return (
                      <Link
                        key={subject.id}
                        href={`/library/${encodeURIComponent(subject.slug || subject.id)}`}
                        className={cn(
                          "card card-interactive group flex items-center gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                          count === 0 && "opacity-80",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border text-xs font-bold",
                            TRACK_COLORS[subject.trackCategory as TrackCategory],
                          )}
                        >
                          {subject.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-foreground">
                            {subject.name}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                            <LuBook className="h-3.5 w-3.5" aria-hidden />
                            {count === 0
                              ? "No resources yet"
                              : `${count} resource${count === 1 ? "" : "s"}`}
                          </p>
                        </div>
                        <LuArrowRight
                          className="h-4 w-4 flex-shrink-0 text-muted transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                          aria-hidden
                        />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
