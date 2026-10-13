import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import { getSessionUser } from "@/lib/session";
import { getTopicStudyData } from "@/lib/classroom-topic";
import { LessonScroll } from "@/components/lesson/lesson-scroll";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ subjectSlug: string; topicSlug: string }>;
}) {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login");

  const { subjectSlug, topicSlug } = await params;
  const backHref = `/classroom/${subjectSlug}/${topicSlug}`;

  const data = await getTopicStudyData(session.id, subjectSlug, topicSlug);
  if (!data) notFound();
  // Every topic has exactly one lesson (150/150 in the live database); a topic
  // without one falls back to the topic page rather than 404ing here.
  if (data === "no-lesson") redirect(backHref);

  return (
    <div className="animate-fade-in">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <LuArrowLeft className="h-4 w-4" />
        {data.subjectName} · {data.topicTitle}
      </Link>

      <LessonScroll
        lessonTitle={data.lessonTitle}
        blocks={data.blocks}
        objectives={data.objectives}
        durationMinutes={data.estimatedMinutes}
        prerequisiteLabels={data.prerequisiteLabels}
        locked={data.locked}
        lockedReason={data.lockedReason}
        legacy={data.legacy}
        backHref={backHref}
        lessonId={data.lessonId}
        subjectSlug={subjectSlug}
        topicSlug={topicSlug}
        passMarkPercent={data.passMarkPercent}
        practiceCount={data.practiceCount}
        checkpoint={data.checkpoint}
      />
    </div>
  );
}
