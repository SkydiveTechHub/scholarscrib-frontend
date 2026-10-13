import { redirect } from "next/navigation";

// The lesson used to live here. The topic page is now the lesson (tracked, with
// its checks inline), so old links, bookmarks and plan items land there.

export default async function StudyRedirect({
  params,
}: {
  params: Promise<{ subjectSlug: string; topicSlug: string }>;
}) {
  const { subjectSlug, topicSlug } = await params;
  redirect(`/classroom/${subjectSlug}/${topicSlug}`);
}
