import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getTopicQuizData } from "@/lib/classroom-topic";
import { LessonQuickQuiz } from "@/components/classroom/lesson-quick-quiz";

// The quick quiz is ten random questions for the topic from
// `GET /api/questions/topic-quiz`: WAEC first, JAMB when WAEC has none, our
// bank before the provider. Untimed and unrecorded -- a self-check over the
// material just read. `/practice` remains the graded, timed exam.

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
  const fellBack = data.examType !== null && data.examType !== data.requestedExamType;

  return (
    <LessonQuickQuiz
      checks={data.checks}
      lessonTitle={data.topicTitle}
      backHref={`/classroom/${subjectSlug}/${topicSlug}`}
      description={
        count === 0
          ? "Untimed, and nothing is recorded."
          : `${count} ${data.examType} question${count === 1 ? "" : "s"} on this topic${
              fellBack ? ` (no ${data.requestedExamType} questions yet)` : ""
            }. Untimed, and nothing is recorded — answer at your own pace.`
      }
    />
  );
}
