import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getTopicStudyData } from "@/lib/classroom-topic";
import { PracticeExit } from "@/components/lesson/practice-exit";

// The graded, timed test that completes a lesson. The server sizes it, times it
// and marks it against the lesson's pass mark; nothing here decides a pass.
// (The untimed self-check is `/quiz`.)

export default async function TopicPracticePage({
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
  if (data === "no-lesson") redirect(backHref);
  // A locked lesson explains what it needs on the study page.
  if (data.locked) redirect(`${backHref}/study`);

  return (
    <PracticeExit
      subjectSlug={subjectSlug}
      topicSlug={topicSlug}
      lessonTitle={data.lessonTitle}
      topicTitle={data.topicTitle}
      passMarkPercent={data.passMarkPercent}
      practiceCount={data.practiceCount}
      backHref={backHref}
    />
  );
}
