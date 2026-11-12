import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { CenterOnboardingWizard } from "@/components/center-app/center-onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function CenterOnboardingPage() {
  await requireTutorPage();

  return (
    <>
      <PageHeader
        title="Set up your center"
        description="Name it, choose subjects and levels, then share your first invite."
      />
      <CenterOnboardingWizard />
    </>
  );
}
