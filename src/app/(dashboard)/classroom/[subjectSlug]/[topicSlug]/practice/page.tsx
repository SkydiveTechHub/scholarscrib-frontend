import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getTopicQuizData } from "@/lib/classroom-topic";
import { LessonQuickQuiz } from "@/components/classroom/lesson-quick-quiz";

// Practice is ten random questions for the topic from
// `GET /api/questions/topic-quiz`: WAEC first, JAMB when WAEC has none, our
// bank before the provider. Untimed and recorded as mastery evidence -- a self-check over the
// material just read. (The lesson note's own questions live in the quick-quiz
// modal on the topic page.)

export default async function TopicPracticePage({
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
      title="Practice"
      record={{ subjectSlug, topicSlug }}
      description={
        count === 0
          ? "Answer at your own pace."
          : `${count} question${count === 1 ? "" : "s"} on this topic. — answer at your own pace.`
      }
    />
  );
}
