import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LuArrowRight, LuBookOpen, LuChevronRight } from "react-icons/lu";
import { getSessionUser } from "@/lib/session";
import { getSubjectPageData } from "@/lib/classroom-data";
import { browserKey } from "@/lib/classroom";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EXAM_STYLES } from "@/lib/subjects";
import { cn } from "@/lib/utils";
import { ClassTermBrowser } from "@/components/classroom/class-term-browser";

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login");

  const { subjectSlug } = await params;
  const userClassLevel = session.classLevel ?? null;

  const data = await getSubjectPageData(session.id, subjectSlug, userClassLevel);
  if (!data) notFound();

  const {
    subject,
    examLabels,
    hasTopics,
    classes,
    initialClassLevel,
    masteredCount,
    startedCount,
    continueTopic,
  } = data;
  const topicTotal = subject.topicCount;
  const percent = topicTotal > 0 ? Math.round((masteredCount / topicTotal) * 100) : 0;

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-sm font-medium text-muted"
      >
        <Link href="/classroom" className="transition-colors hover:text-foreground">
          Classroom
        </Link>
        <LuChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-foreground">{subject.name}</span>
      </nav>

      {/* Subject header: who this is, how far they are, and where to go next */}
      <div className="card p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary">
              {subject.code}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {subject.name}
              </h1>
              {subject.description && (
                <p className="text-sm text-muted">{subject.description}</p>
              )}
            </div>
          </div>

          {continueTopic && (
            <Link
              href={`/classroom/${subjectSlug}/${continueTopic.slug}`}
              className={buttonClass("primary", "lg", "max-w-full")}
            >
              <span className="truncate">
                {continueTopic.started ? "Continue" : "Start"}: {continueTopic.title}
              </span>
              <LuArrowRight className="h-4 w-4 flex-shrink-0" />
            </Link>
          )}
        </div>

        {topicTotal > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                {masteredCount} of {topicTotal} topics mastered
              </p>
              <p className="text-xs font-semibold text-muted">
                {startedCount > 0 ? `${startedCount} in progress · ` : ""}
                {percent}%
              </p>
            </div>
            <Progress value={percent} />
          </div>
        )}
      </div>

      {/* Curriculum — graph view is hidden from users for now; GraphView/CurriculumViewToggle are kept for re-enabling */}
      <div className="mt-8">
        {hasTopics ? (
          <ClassTermBrowser
            key={browserKey(subject.id, initialClassLevel)}
            subjectSlug={subjectSlug}
            subjectId={subject.id}
            classes={classes}
            initialClassLevel={initialClassLevel}
          />
        ) : (
          <EmptyState
            icon={<LuBookOpen className="h-6 w-6" />}
            title="No topics yet"
            description="Topics for this subject are being prepared. Check back soon."
          />
        )}
      </div>

      {/* Quick practice */}
      <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-sm font-bold text-foreground">Past questions</h3>
          <p className="mt-0.5 text-sm text-muted">
            Real exam questions for this subject. For one class, use Practice above.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {examLabels.map((exam) => (
            <Link
              key={exam}
              href={`/practice/past-questions/${subjectSlug}?exam=${exam}`}
              className={cn(
                "inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm font-bold transition-colors",
                EXAM_STYLES[exam]?.link ?? EXAM_STYLES.WAEC.link,
              )}
            >
              Practice {exam} Questions
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
