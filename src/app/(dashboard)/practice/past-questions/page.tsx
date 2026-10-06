import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PastQuestionPicker } from "@/components/practice/past-question-picker";
import { PageHeader } from "@/components/ui/page-header";

export default async function PastQuestionsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const track = session.track ?? null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Past Questions"
        description="Pick an exam, a subject in your track, then a year. Three quick steps to your next practice session."
      />

      <PastQuestionPicker track={track} />
    </div>
  );
}
