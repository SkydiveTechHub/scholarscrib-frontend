import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { CenterStudentsPanel } from "@/components/center-app/center-students-panel";

export const dynamic = "force-dynamic";

export default async function CenterStudentsPage() {
  await requireTutorPage();

  return (
    <>
      <PageHeader
        title="Students"
        description="Assignment-scoped views only — never private practice or mastery."
      />
      <CenterStudentsPanel />
    </>
  );
}
