import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { StudentRecommendationsPanel } from "@/components/center-app/student-recommendations-panel";

export const metadata: Metadata = {
  title: "Recommendations — ScholarsCrib",
};

export default async function RecommendationsPage() {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login?callbackUrl=/recommendations");

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Recommendations"
        description="Short notes from your tutors about assigned work. Advisory only — your plan stays yours."
      />
      <div className="max-w-2xl">
        <StudentRecommendationsPanel />
      </div>
    </div>
  );
}
