"use client";

import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { NoteBlockView } from "@/components/classroom/lesson-notes";
import type { NotesBlock } from "@/lib/classroom";
import { useSaveLessonProgress } from "@/hooks/api/use-lessons";

// The lesson itself, read top to bottom. It is what a topic opens on, and it
// tracks what has been read. It holds no questions: those are the quick quiz, so
// the lesson would otherwise ask the same things twice. It never completes a
// lesson either; only the practice test does that. The one-idea-at-a-time card
// format with reveals and flips is flashcards' job.
//
// Only rendered for an unlocked lesson. A locked one is shown as plain notes,
// so a preview never records progress it has not earned.

const SAVE_DELAY_MS = 800;

export function LessonScroll({
  blocks,
  lessonId,
  visitedIds,
}: {
  /** The teaching blocks only; the caller has already taken the questions out. */
  blocks: NotesBlock[];
  lessonId: string;
  /** Sections already read, so a return visit keeps its progress. */
  visitedIds: string[];
}) {
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set(visitedIds),
  );
  const bodyRef = useRef<HTMLDivElement>(null);

  const percent = Math.min(
    100,
    Math.round((visited.size / Math.max(1, blocks.length)) * 100),
  );

  // A section counts as read when it scrolls into view.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => (entry.target as HTMLElement).dataset.readId)
          .filter((id): id is string => Boolean(id));
        if (seen.length === 0) return;
        setVisited((prev) => {
          if (seen.every((id) => prev.has(id))) return prev;
          const next = new Set(prev);
          seen.forEach((id) => next.add(id));
          return next;
        });
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    root
      .querySelectorAll<HTMLElement>("[data-read-id]")
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [blocks]);

  // Fire-and-forget; `mutate` never throws, so a failed save stays silent.
  // Debounced because scrolling marks sections in quick succession, and skipped
  // until something actually changes so merely opening a lesson writes nothing.
  const { mutate: saveProgress } = useSaveLessonProgress();
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      saveProgress({
        lessonId,
        status: "IN_PROGRESS",
        completionPercent: percent,
        checkpointData: { visited: Array.from(visited) },
      });
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [visited, percent, lessonId, saveProgress]);

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 bg-background/90 px-1 py-2 backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted">
          <span>Lesson progress</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <Progress value={percent} tone="auto" className="h-1.5" />
      </div>

      <div ref={bodyRef} className="mt-4 space-y-6">
        {blocks.map((block, index) => (
          <div
            key={`${block.id}-${index}`}
            id={`block-${block.id}`}
            data-read-id={block.id}
            className="scroll-mt-24"
          >
            <NoteBlockView block={block} />
          </div>
        ))}
      </div>
    </div>
  );
}
