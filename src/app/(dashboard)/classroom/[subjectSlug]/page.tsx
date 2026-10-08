import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LuArrowLeft, LuBookOpen } from "react-icons/lu";
import { getSessionUser } from "@/lib/session";
import { getSubjectPageData } from "@/lib/classroom-data";
import { EmptyState } from "@/components/ui/empty-state";
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
  } = data;

  return (
    <div>
      <Link
        href="/classroom"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <LuArrowLeft className="h-4 w-4" />
        All Subjects
      </Link>

      {/* Subject header */}
      <div className="card relative overflow-hidden p-6 md:p-8">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/5" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary">
                {subject.code}
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {subject.name}
                </h1>
                <p className="text-sm text-muted">{subject.description}</p>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 text-center">
            <p className="text-2xl font-bold tracking-tight text-foreground">{subject.topicCount}</p>
            <p className="text-xs text-muted">Topics</p>
          </div>
        </div>
      </div>

      {/* Curriculum — graph view is hidden from users for now; GraphView/CurriculumViewToggle are kept for re-enabling */}
      <div className="mt-8">
        {hasTopics ? (
          <ClassTermBrowser
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
          <h3 className="text-sm font-bold text-foreground">Quick Practice</h3>
          <p className="mt-0.5 text-xs text-muted">
            Jump straight into questions for a specific exam.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {examLabels.map((exam) => (
            <Link
              key={exam}
              href={`/practice/past-questions/${subjectSlug}?exam=${exam}`}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-bold transition-colors",
                exam === "WAEC"
                  ? "bg-tone-blue-soft text-tone-blue-ink hover:bg-tone-blue-line"
                  : exam === "JAMB"
                    ? "bg-tone-green-soft text-tone-green-ink hover:bg-tone-green-line"
                    : "bg-tone-purple-soft text-tone-purple-ink hover:bg-tone-purple-line",
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
