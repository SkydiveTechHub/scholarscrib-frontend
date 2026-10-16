import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getTopicQuizData } from "@/lib/classroom-topic";
import { LessonQuickQuiz } from "@/components/classroom/lesson-quick-quiz";

// The untimed self-check: ten random questions for the topic from
// `GET /api/questions/topic-quiz` (WAEC first, JAMB when WAEC has none, our
// bank before the provider), recorded as mastery evidence. Low stakes by
// design. The graded, timed test that completes the lesson is `/practice`.

export default async function TopicQuizPage({
  params,
}: {
  params: Promise<{ subjectSlug: string; topicSlug: string }>;
}) {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login");

  const { subjectSlug, topicSlug } = await params;

  const data = await getTopicQuizData(subjectSlug, topicSlug);
  if (!data) notFound();

  const count = data.checks.length;

  return (
    <LessonQuickQuiz
      checks={data.checks}
      lessonTitle={data.topicTitle}
      backHref={`/classroom/${subjectSlug}/${topicSlug}`}
      title="Quick quiz"
      record={{ subjectSlug, topicSlug }}
      description={
        count === 0
          ? "Answer at your own pace."
          : `${count} question${count === 1 ? "" : "s"} on this topic. Untimed, so answer at your own pace.`
      }
    />
  );
}
