import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { CenterAssignmentsPanel } from "@/components/center-app/center-assignments-panel";

export const dynamic = "force-dynamic";

export default async function CenterAssignmentsPage() {
  await requireTutorPage();

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Create and publish work for your students."
      />
      <CenterAssignmentsPanel />
    </>
  );
}
