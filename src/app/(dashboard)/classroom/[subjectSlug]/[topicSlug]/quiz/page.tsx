import { redirect } from "next/navigation";

// The bank-backed quiz is now Practice; the lesson note's own quick quiz is a
// modal on the topic page. Kept so old links still land somewhere sensible.

export default async function TopicQuizRedirect({
  params,
}: {
  params: Promise<{ subjectSlug: string; topicSlug: string }>;
}) {
  const { subjectSlug, topicSlug } = await params;
  redirect(`/classroom/${subjectSlug}/${topicSlug}/practice`);
}
