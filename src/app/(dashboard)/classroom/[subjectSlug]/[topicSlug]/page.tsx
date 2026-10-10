import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuChevronRight,
  LuClock,
  LuLink,
  LuLock,
  LuTarget,
} from "react-icons/lu";
import { getSessionUser } from "@/lib/session";
import { getTopicPageData } from "@/lib/classroom-topic";
import type { CheckBlock, ShortBlock } from "@/lib/lesson-engine";
import { PretestDialog } from "@/components/path/pretest-dialog";
import { LessonNotes } from "@/components/classroom/lesson-notes";
import { TopicActionBar } from "@/components/classroom/topic-action-bar";
import { TopicResources } from "@/components/classroom/topic-resources";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TERM_LABELS } from "@/lib/curriculum-scope";

const LEVEL_LABELS: Record<string, string> = {
  STRONG: "Strong",
  COMPETENT: "Competent",
  DEVELOPING: "Developing",
  WEAK: "Weak",
};

const MASTERY_VARIANT: Record<string, "green" | "amber" | "neutral"> = {
  STRONG: "green",
  COMPETENT: "green",
  DEVELOPING: "amber",
  WEAK: "neutral",
};

// Mirrors MASTERY_MIN_QUESTIONS / TARGET in the backend's learning/evidence.py.
const MASTERY_MIN_QUESTIONS = 7;
const MASTERY_TARGET = 70;

function answeredCount(state: {
  accObservations: number;
  lessonObservations: number;
}): number {
  return state.accObservations + state.lessonObservations;
}

function hasEvidence(state: {
  accObservations: number;
  lessonObservations: number;
  srsObservations: number;
}): boolean {
  return state.accObservations + state.lessonObservations + state.srsObservations > 0;
}

const CLASS_COLORS: Record<string, string> = {
  SS1: "bg-tone-blue-soft text-tone-blue-ink border-tone-blue-line",
  SS2: "bg-tone-green-soft text-tone-green-ink border-tone-green-line",
  SS3: "bg-tone-purple-soft text-tone-purple-ink border-tone-purple-line",
};

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ subjectSlug: string; topicSlug: string }>;
}) {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login");

  const { subjectSlug, topicSlug } = await params;

  const data = await getTopicPageData(session.id, subjectSlug, topicSlug);
  if (!data) notFound();

  const {
    subject,
    topic,
    lesson,
    deckId,
    pretestCertified,
    topicReady,
    prereqs,
    topicState,
    previous,
    next,
    lessonResources,
    subjectResources,
  } = data;

  const { classLevel, term } = topic;
  const classColor = CLASS_COLORS[classLevel] ?? "bg-secondary text-muted border-border";

  return (
    <div className="animate-fade-in">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-sm font-medium text-muted"
      >
        <Link href="/classroom" className="transition-colors hover:text-foreground">
          Classroom
        </Link>
        <LuChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        <Link
          href={`/classroom/${subjectSlug}`}
          className="transition-colors hover:text-foreground"
        >
          {subject.name}
        </Link>
        <LuChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-foreground">
          {classLevel} · {TERM_LABELS[term] ?? term}
        </span>
      </nav>

      <div className="card relative overflow-hidden p-6 md:p-8">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/5" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary">
                {subject.code}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                  {topic.title}
                </h1>
                <p className="text-sm text-muted">{subject.name}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={cn("chip border font-bold", classColor)}>
                {classLevel} · {TERM_LABELS[term] ?? term}
              </span>
              {topic.attemptedCount > 0 && (
                <Badge variant="green">
                  <LuTarget className="h-3 w-3" />
                  {topic.attemptedCount}{" "}
                  {topic.attemptedCount === 1 ? "question" : "questions"} attempted
                </Badge>
              )}
              {topic.waecWeight > 0 && <Badge variant="blue">WAEC weight {topic.waecWeight}</Badge>}
              {topic.jambWeight > 0 && <Badge variant="green">JAMB weight {topic.jambWeight}</Badge>}
              {/* Without any evidence the mastery is just the 45% prior, not a result. */}
              {topicState && hasEvidence(topicState) && (
                <>
                  <Badge variant={MASTERY_VARIANT[topicState.level] ?? "neutral"}>
                    <LuTarget className="h-3 w-3" />
                    {topicState.mastery}% mastery ·{" "}
                    {LEVEL_LABELS[topicState.level] ?? topicState.level}
                  </Badge>
                  {topicState.mastery >= MASTERY_TARGET &&
                    answeredCount(topicState) < MASTERY_MIN_QUESTIONS && (
                      <Badge variant="amber">
                        <LuTarget className="h-3 w-3" />
                        Needs more practice · {answeredCount(topicState)}/
                        {MASTERY_MIN_QUESTIONS} questions
                      </Badge>
                    )}
                  {topicState.retention != null && (
                    <Badge
                      variant={topicState.retention < 0.8 ? "amber" : "blue"}
                    >
                      <LuClock className="h-3 w-3" />
                      Retention {Math.round(topicState.retention * 100)}%
                    </Badge>
                  )}
                </>
              )}
              {pretestCertified && (
                <Badge variant="green">
                  <LuCheck className="h-3 w-3" />
                  Certified by pretest
                </Badge>
              )}
            </div>
          </div>

          <PretestDialog
            topicId={topic.id}
            topicTitle={topic.title}
            alreadyPassed={pretestCertified}
          />
        </div>
      </div>

      {prereqs.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <LuLink className="h-4 w-4 text-primary" />
            Prerequisites
          </h2>
          <div className="flex flex-wrap gap-2">
            {prereqs.map((prereq) => {
              const chip = (
                <span
                  className={cn(
                    "chip border",
                    prereq.met
                      ? "border-success/30 bg-success-soft text-success"
                      : "border-tone-amber-line bg-tone-amber-soft text-tone-amber-ink",
                  )}
                >
                  {prereq.met ? (
                    <LuCheck className="h-3.5 w-3.5" />
                  ) : (
                    <LuLock className="h-3.5 w-3.5" />
                  )}
                  {prereq.title}
                  {prereq.met
                    ? " — ready"
                    : ` — needs ${prereq.need}% mastery (${Math.round(
                        prereq.mastery,
                      )}%)`}
                </span>
              );
              if (prereq.subjectId === subject.id && prereq.slug) {
                return (
                  <Link
                    key={prereq.topicId}
                    href={`/classroom/${subjectSlug}/${prereq.slug}`}
                    className="transition-opacity hover:opacity-80"
                  >
                    {chip}
                  </Link>
                );
              }
              return <span key={prereq.topicId}>{chip}</span>;
            })}
          </div>
          {!topicReady && (
            <p className="mt-3 text-xs text-muted">
              Complete the prerequisites above to unlock this topic&apos;s
              lessons.
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        {lesson ? (
          <LessonNotes
            blocks={lesson.blocks}
            fallbackContent={lesson.fallbackContent}
          />
        ) : (
          <div className="card p-6 text-sm text-muted">
            Notes for this topic are still being prepared.
          </div>
        )}
      </div>

      {/* After the note, so the actions appear once the student reaches its end. */}
      {lesson && (
        <TopicActionBar
          subjectSlug={subjectSlug}
          topicSlug={topicSlug}
          lessonId={lesson.id}
          hasDeck={Boolean(deckId)}
          deckId={deckId}
          checks={lesson.blocks.filter(
            (block): block is CheckBlock | ShortBlock =>
              block.type === "check" || block.type === "short",
          )}
        />
      )}

      <TopicResources
        lessonResources={lessonResources}
        subjectResources={subjectResources}
        subjectName={subject.name}
      />

      <div className="mt-8 flex flex-wrap items-stretch justify-between gap-3">
        {previous ? (
          <Link
            href={`/classroom/${subjectSlug}/${previous.slug}`}
            className="card flex min-w-[220px] flex-1 items-center gap-2 p-4 transition-colors hover:border-primary/40"
          >
            <LuArrowLeft className="h-4 w-4 flex-shrink-0 text-muted" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-muted">Previous</span>
              <span className="block truncate text-sm font-bold text-foreground">
                {previous.title}
              </span>
            </span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/classroom/${subjectSlug}/${next.slug}`}
            className="card flex min-w-[220px] flex-1 items-center justify-end gap-2 p-4 text-right transition-colors hover:border-primary/40"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-muted">Next</span>
              <span className="block truncate text-sm font-bold text-foreground">
                {next.title}
              </span>
            </span>
            <LuArrowRight className="h-4 w-4 flex-shrink-0 text-muted" />
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </div>
    </div>
  );
}
