"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuBookOpen, LuChevronRight, LuTriangleAlert } from "react-icons/lu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { libraryResourcesQuery } from "@/hooks/api/use-library";
import { TRACK_COLORS, type TrackCategory } from "@/lib/subjects";
import { MATERIAL_LABELS, type MaterialType } from "@/lib/materials";
import type { LibrarySubject } from "@/lib/library";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResourceCard, isReadable, type SubjectResource } from "./resource-card";

const PDFReader = dynamic(() => import("@/components/library/pdf-reader"), { ssr: false });

function ResourceSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="card flex animate-pulse items-start gap-4 p-4 motion-reduce:animate-none">
          <div className="h-11 w-11 rounded-xl bg-secondary" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-3.5 w-3/5 rounded bg-secondary" />
            <div className="h-3 w-4/5 rounded bg-secondary" />
            <div className="h-5 w-16 rounded-full bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        selected
          ? "border-primary bg-primary-soft text-primary-soft-foreground"
          : "border-border bg-card text-muted hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * One subject's resources. The subject is the route and the open PDF is
 * `?read=<id>`, so Back closes the reader, a refresh keeps the place, and both
 * can be shared. The list is a query, so a failure belongs to this subject and
 * never replaces the shelf.
 */
export function SubjectResources({ subject }: { subject: LibrarySubject }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const readId = useSearchParams().get("read");
  // Whether this visit pushed the reader entry, so closing can pop it instead
  // of stacking another history entry.
  const pushedReader = useRef(false);

  const [type, setType] = useState<string>("ALL");
  const [freeOnly, setFreeOnly] = useState(false);

  const query = useQuery(libraryResourcesQuery(subject.id));
  const resources = useMemo(() => (query.data ?? []) as SubjectResource[], [query.data]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const resource of resources) {
      counts.set(resource.resourceType, (counts.get(resource.resourceType) ?? 0) + 1);
    }
    return counts;
  }, [resources]);
  const hasPaid = resources.some((resource) => !resource.isFree);

  const visible = resources.filter(
    (resource) =>
      (type === "ALL" || resource.resourceType === type) && (!freeOnly || resource.isFree),
  );

  // The open PDF comes from the URL; a missing, locked or non-PDF id is ignored.
  const reading = readId
    ? (resources.find((resource) => resource.id === readId && isReadable(resource)) ?? null)
    : null;

  const openReader = useCallback(
    (resource: SubjectResource) => {
      pushedReader.current = true;
      router.push(`${pathname}?read=${encodeURIComponent(resource.id)}`, { scroll: false });
    },
    [router, pathname],
  );

  const closeReader = useCallback(() => {
    if (pushedReader.current) {
      pushedReader.current = false;
      router.back();
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [router, pathname]);

  // Private links expire; ask the server for a fresh one. The query cache
  // updates, `reading` re-derives with the new url, and the reader stays
  // mounted, so the student keeps their page and zoom.
  const reloadPdf = useCallback(async () => {
    if (!reading) return;
    const rows = (await queryClient.fetchQuery({
      ...libraryResourcesQuery(subject.id),
      staleTime: 0,
    })) as SubjectResource[];
    const fresh = rows.find((row) => row.id === reading.id);
    if (!fresh || fresh.locked || !fresh.url) {
      throw new Error("This resource is no longer available.");
    }
  }, [queryClient, subject.id, reading]);

  return (
    <div className="animate-fade-in">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-sm font-medium text-muted"
      >
        <Link href="/library" className="transition-colors hover:text-foreground">
          Library
        </Link>
        <LuChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
        <span className="text-foreground">{subject.name}</span>
      </nav>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border text-xs font-bold",
              TRACK_COLORS[subject.trackCategory as TrackCategory],
            )}
          >
            {subject.code}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{subject.name}</h1>
            <p className="text-sm text-muted">
              {reading ? `Reading: ${reading.title}` : "Textbooks, videos, and study materials"}
            </p>
          </div>
        </div>
        {subject.description && !reading && (
          <p className="mt-3 max-w-2xl text-sm text-muted">{subject.description}</p>
        )}
      </div>

      {reading ? (
        <PDFReader
          file={reading.url}
          title={reading.title}
          expiresAt={reading.expiresAt ?? null}
          onReload={reloadPdf}
          onClose={closeReader}
        />
      ) : query.isPending ? (
        <ResourceSkeleton />
      ) : query.isError ? (
        <EmptyState
          tone="primary"
          icon={<LuTriangleAlert className="h-6 w-6" />}
          title="Couldn't load these resources"
          description="Check your connection and try again."
          action={
            <button
              type="button"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              className={buttonClass("secondary", "md")}
            >
              {query.isFetching ? "Trying…" : "Try again"}
            </button>
          }
        />
      ) : resources.length === 0 ? (
        <EmptyState
          tone="primary"
          icon={<LuBookOpen className="h-6 w-6" />}
          title={`No resources yet for ${subject.name}`}
          description="Check back later — new materials are being added regularly."
          action={
            <Link href="/library" className={buttonClass("secondary", "md")}>
              Back to library
            </Link>
          }
        />
      ) : (
        <>
          {(typeCounts.size > 1 || hasPaid) && (
            <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter resources">
              {typeCounts.size > 1 && (
                <>
                  <FilterChip selected={type === "ALL"} onClick={() => setType("ALL")}>
                    All ({resources.length})
                  </FilterChip>
                  {Array.from(typeCounts.entries()).map(([key, count]) => (
                    <FilterChip key={key} selected={type === key} onClick={() => setType(key)}>
                      {MATERIAL_LABELS[key as MaterialType] ?? key} ({count})
                    </FilterChip>
                  ))}
                </>
              )}
              {hasPaid && (
                <FilterChip selected={freeOnly} onClick={() => setFreeOnly((on) => !on)}>
                  Free only
                </FilterChip>
              )}
            </div>
          )}

          <h2 className="sr-only">Resources</h2>
          <p className="sr-only" aria-live="polite">
            {`${visible.length} ${visible.length === 1 ? "resource" : "resources"} shown`}
          </p>

          {visible.length === 0 ? (
            <EmptyState
              icon={<LuBookOpen className="h-6 w-6" />}
              title="Nothing matches these filters"
              action={
                <button
                  type="button"
                  onClick={() => {
                    setType("ALL");
                    setFreeOnly(false);
                  }}
                  className={buttonClass("secondary", "md")}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visible.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} onRead={openReader} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
