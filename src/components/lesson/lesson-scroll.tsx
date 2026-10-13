"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LuArrowRight,
  LuBookOpen,
  LuChevronLeft,
  LuClock,
  LuLock,
} from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NoteBlockView } from "@/components/classroom/lesson-notes";
import { Markdown } from "./markdown";
import { ObjectivesPanel } from "./objectives-panel";
import { KnowledgeCheck } from "./knowledge-check";
import { ShortAnswer } from "./short-answer";
import type { LessonBlock } from "@/lib/lesson-engine";
import { useSaveLessonProgress } from "@/hooks/api/use-lessons";

// The lesson, read top to bottom. Knowledge checks sit inline where the author
// put them; the page tracks what has been read and answered, and ends at the
// practice exit, which is the only thing that completes the lesson. The
// one-idea-at-a-time card format with reveals and flips is flashcards' job.

type CheckResult = { attempts: number; correct: boolean };

type LegacyData = {
  content: string;
  keyPoints: string[];
  summary: string | null;
};

type LessonScrollProps = {
  lessonTitle: string;
  blocks: LessonBlock[];
  objectives: string[];
  durationMinutes: number;
  prerequisiteLabels: string[];
  locked: boolean;
  lockedReason?: string | null;
  legacy?: LegacyData;
  backHref: string;
  lessonId: string;
  subjectSlug: string;
  topicSlug: string;
  passMarkPercent: number;
  practiceCount: number;
  /** Progress already made, so a return visit resumes where it stopped. */
  checkpoint?: {
    visited: string[];
    checks: Record<string, CheckResult>;
  };
};

const SAVE_DELAY_MS = 800;

export function LessonScroll(props: LessonScrollProps) {
  if (props.blocks.length === 0) {
    return <LegacyLesson {...props} />;
  }
  return <BlockLesson {...props} />;
}

function LessonHeader({ props }: { props: LessonScrollProps }) {
  return (
    <div className="card p-6 md:p-8">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <LuBookOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground md:text-2xl">
            {props.lessonTitle}
          </h1>
          {props.durationMinutes > 0 && (
            <div className="mt-2">
              <Badge variant="blue">
                <LuClock className="h-3 w-3" />~{props.durationMinutes}min
              </Badge>
            </div>
          )}
        </div>
      </div>

      {props.prerequisiteLabels.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            Before you begin
          </p>
          <div className="flex flex-wrap gap-2">
            {props.prerequisiteLabels.map((label, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground"
              >
                <LuBookOpen className="h-3 w-3 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LockedNotice({ props }: { props: LessonScrollProps }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted">
        <LuLock className="h-7 w-7" />
      </span>
      <h2 className="text-base font-bold text-foreground">
        Finish the prerequisite first
      </h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        {props.lockedReason ??
          "This lesson builds on an earlier topic. Complete the prerequisite lesson, then come back."}
      </p>
      <Link href={props.backHref} className={buttonClass("primary", "md", "mt-5")}>
        <LuChevronLeft className="h-4 w-4" />
        Back to topic
      </Link>
    </div>
  );
}

function PracticeCta({
  props,
  unanswered,
}: {
  props: LessonScrollProps;
  unanswered: number;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-8 text-center">
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        Now prove it
      </h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        One timed test stands between you and a completed lesson.
        {unanswered > 0 &&
          ` You skipped ${unanswered} check${unanswered === 1 ? "" : "s"} above — they're quick practice if you want them first.`}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href={props.backHref} className={buttonClass("outline", "md")}>
          Back to topic
        </Link>
        <Link
          href={`/classroom/${props.subjectSlug}/${props.topicSlug}/practice`}
          className={buttonClass("success", "md")}
        >
          Take the practice test
          <LuArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {props.practiceCount > 0 && (
        <p className="mt-4 text-xs font-medium text-muted">
          {props.practiceCount} questions · 90 seconds each · pass mark{" "}
          {props.passMarkPercent}%
        </p>
      )}
    </div>
  );
}

function BlockLesson(props: LessonScrollProps) {
  // Saved state seeds the first render. Blocks can be re-authored under a
  // student, so ids that no longer exist are dropped rather than counted.
  const savedVisited = (props.checkpoint?.visited ?? []).filter((id) =>
    props.blocks.some((block) => block.id === id),
  );
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set(savedVisited),
  );
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>(
    () => ({ ...(props.checkpoint?.checks ?? {}) }),
  );
  const bodyRef = useRef<HTMLDivElement>(null);

  const isCheck = (block: LessonBlock) =>
    block.type === "check" || block.type === "short";
  const total = props.blocks.length;
  const percent = Math.round((visited.size / total) * 100);
  const unanswered = props.blocks.filter(
    (block) => isCheck(block) && !visited.has(block.id),
  ).length;

  // Reading counts when a section scrolls into view; a check counts only once
  // it is answered, because looking at a question proves nothing.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root || props.locked) return;
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
  }, [props.locked, props.blocks]);

  // A returning student lands at the first section they have not seen.
  useEffect(() => {
    if (props.locked || savedVisited.length === 0) return;
    const firstUnseen = props.blocks.find(
      (block) => !savedVisited.includes(block.id),
    );
    if (!firstUnseen) return;
    document
      .getElementById(`block-${firstUnseen.id}`)
      ?.scrollIntoView({ block: "start" });
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire-and-forget; `mutate` never throws, so a failed save stays silent.
  // Debounced because scrolling marks sections in quick succession.
  const { mutate: saveProgress } = useSaveLessonProgress();
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      saveProgress({
        lessonId: props.lessonId,
        status: "IN_PROGRESS",
        completionPercent: Math.min(100, percent),
        checkpointData: {
          visited: Array.from(visited),
          checks: Object.fromEntries(
            Object.entries(checkResults).map(([id, r]) => [
              id,
              { attempts: r.attempts, correct: r.correct },
            ]),
          ),
        },
      });
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [visited, checkResults, percent, props.lessonId, saveProgress]);

  function handleCheckResult(blockId: string, attempts: number, correct: boolean) {
    setCheckResults((prev) => ({ ...prev, [blockId]: { attempts, correct } }));
    setVisited((prev) => new Set(prev).add(blockId));
  }

  if (props.locked) {
    return (
      <div className="animate-fade-in space-y-6">
        <LessonHeader props={props} />
        <ObjectivesPanel objectives={props.objectives} />
        <LockedNotice props={props} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <LessonHeader props={props} />

      <div className="sticky top-0 z-10 -mx-1 bg-background/90 px-1 py-2 backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted">
          <span>Progress</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <Progress value={percent} tone="auto" className="h-1.5" />
      </div>

      <div ref={bodyRef} className="space-y-6">
        {props.blocks.map((block, index) => {
          if (block.type === "check") {
            const source = props.blocks.find((b) => b.id === block.afterCard);
            return (
              <div key={block.id} id={`block-${block.id}`}>
                <KnowledgeCheck
                  block={block}
                  refresher={
                    source && source.type !== "check" ? (
                      <a
                        href={`#block-${source.id}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Jump back to the section this covers
                      </a>
                    ) : null
                  }
                  onResult={(attempts, correct) =>
                    handleCheckResult(block.id, attempts, correct)
                  }
                />
              </div>
            );
          }
          if (block.type === "short") {
            return (
              <div key={block.id} id={`block-${block.id}`}>
                <ShortAnswer
                  block={block}
                  onResult={(attempts, correct) =>
                    handleCheckResult(block.id, attempts, correct)
                  }
                />
              </div>
            );
          }
          return (
            <div
              key={`${block.id}-${index}`}
              id={`block-${block.id}`}
              data-read-id={block.id}
              className="scroll-mt-24"
            >
              <NoteBlockView block={block} />
            </div>
          );
        })}
      </div>

      <PracticeCta props={props} unanswered={unanswered} />
    </div>
  );
}

// Lessons with no blocks render their markdown content as a single page.
function LegacyLesson(props: LessonScrollProps) {
  const keyPoints = props.legacy?.keyPoints ?? [];
  return (
    <div className="animate-fade-in space-y-6">
      <LessonHeader props={props} />

      <ObjectivesPanel objectives={props.objectives} />

      <div className="card p-6 md:p-8">
        {props.legacy?.content ? (
          <div className="prose-sm max-w-none text-[15px] leading-relaxed text-foreground/90">
            <Markdown content={props.legacy.content} />
          </div>
        ) : (
          <p className="text-sm text-muted">
            This lesson is still being prepared.
          </p>
        )}

        {keyPoints.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5">
            <h2 className="mb-3 text-sm font-bold text-foreground">Key Points</h2>
            <ul className="space-y-2">
              {keyPoints.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90"
                >
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {props.legacy?.summary && (
          <div className="mt-5 rounded-xl bg-primary-soft p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary-soft-foreground">
              Summary
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">
              {props.legacy.summary}
            </p>
          </div>
        )}
      </div>

      {props.locked ? <LockedNotice props={props} /> : <PracticeCta props={props} unanswered={0} />}
    </div>
  );
}
