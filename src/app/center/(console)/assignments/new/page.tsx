import { Suspense } from "react";
import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { AssignmentCreateWizard } from "@/components/center-app/assignment-create-wizard";
import { Spinner } from "@/components/ui/spinner";

export const dynamic = "force-dynamic";

export default async function CenterAssignmentNewPage() {
  await requireTutorPage();

  return (
    <>
      <PageHeader
        title="New assignment"
        description="Type → filters → preview → targets → settings → publish."
      />
      <Suspense fallback={<Spinner label="Loading wizard…" />}>
        <AssignmentCreateWizard />
      </Suspense>
    </>
  );
}
