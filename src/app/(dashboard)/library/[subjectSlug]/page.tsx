import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getLibraryShelf } from "@/lib/library";
import { SubjectResources } from "@/components/library/subject-resources";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = {
  title: "Library — ScholarsCrib",
};

export default async function LibrarySubjectPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const user = await getSessionUser();
  if (!user?.id) redirect("/login");

  const { subjectSlug } = await params;
  const slug = decodeURIComponent(subjectSlug);

  // The shelf is already narrowed to the student's track, so a subject outside
  // it is simply not found rather than leaked.
  const subjects = await getLibraryShelf();
  const subject = subjects.find((s) => s.slug === slug || s.id === slug);
  if (!subject) notFound();

  return (
    // `useSearchParams` (the open PDF) needs a Suspense boundary.
    <Suspense fallback={<PageSkeleton />}>
      <SubjectResources subject={subject} />
    </Suspense>
  );
}
