import Link from "next/link";
import { redirect } from "next/navigation";
import { LuLayoutGrid, LuFilter, LuArrowRight } from "react-icons/lu";
import { getSessionUser } from "@/lib/session";
import { getClassroomSubjects } from "@/lib/classroom-data";
import {
  TRACK_CATEGORIES,
  TRACK_COLORS,
  TRACK_LABELS,
  EXAM_STYLES,
  type TrackCategory,
} from "@/lib/subjects";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default async function ClassroomPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const { all } = await searchParams;
  const showAll = all === "1";

  const track = session.track ?? null;
  const { byCategory, hasNarrowing } = await getClassroomSubjects(track, showAll);

  return (
    <div>
      <PageHeader
        title="Classroom"
        description={
          showAll || !hasNarrowing
            ? "Study any WAEC, JAMB, or NECO subject — notes, quizzes, and practice in one place."
            : `Study your ${TRACK_LABELS[track as TrackCategory] ?? ""} subjects, plus the core subjects everyone sits.`
        }
        action={
          hasNarrowing ? (
            <Link
              href={showAll ? "/classroom" : "/classroom?all=1"}
              className={buttonClass("outline", "md")}
            >
              {showAll ? (
                <>
                  <LuFilter className="h-4 w-4 text-muted" />
                  Show my subjects
                </>
              ) : (
                <>
                  <LuLayoutGrid className="h-4 w-4 text-muted" />
                  Show all subjects
                </>
              )}
            </Link>
          ) : undefined
        }
      />

      {TRACK_CATEGORIES.map((category) => {
        const list = byCategory[category];
        if (!list?.length) return null;

        return (
          <div key={category} className="mb-10">
            <h2 className="section-label mb-4">
              {TRACK_LABELS[category]} Subjects
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((subject) => (
                <Link
                  key={subject.code}
                  href={`/classroom/${subject.slug}`}
                  className="card card-interactive group flex items-center gap-4 p-4"
                  aria-label={
                    subject.topicCount > 0
                      ? `${subject.name}, ${subject.masteredCount} of ${subject.topicCount} topics mastered`
                      : subject.name
                  }
                >
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${TRACK_COLORS[category]}`}
                  >
                    {subject.code}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-foreground">
                      {subject.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {subject.isWaec && <Badge variant={EXAM_STYLES.WAEC.badge}>WAEC</Badge>}
                      {subject.isJamb && <Badge variant={EXAM_STYLES.JAMB.badge}>JAMB</Badge>}
                      {subject.isNeco && <Badge variant={EXAM_STYLES.NECO.badge}>NECO</Badge>}
                      {subject.questionCount > 0 && (
                        <span className="text-xs font-semibold text-muted">
                          {subject.questionCount} questions
                        </span>
                      )}
                    </div>
                    {subject.topicCount > 0 && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <Progress
                          value={(subject.masteredCount / subject.topicCount) * 100}
                          className="h-1.5 flex-1"
                        />
                        <span className="flex-shrink-0 text-xs font-semibold text-muted">
                          {subject.masteredCount}/{subject.topicCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <LuArrowRight className="h-4 w-4 flex-shrink-0 text-muted transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
