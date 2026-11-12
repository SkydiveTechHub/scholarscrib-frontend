import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { AssignedInboxPanel } from "@/components/center-app/assigned-inbox-panel";

export const metadata: Metadata = {
  title: "Assigned — ScholarsCrib",
};

export default async function AssignedInboxPage() {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login?callbackUrl=/assigned");

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Assigned"
        description="Work your tutors set — open by due date, then start when you are ready."
      />
      <div className="max-w-2xl">
        <AssignedInboxPanel />
      </div>
    </div>
  );
}
