import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { CenterSettingsPanel } from "@/components/center-app/center-settings-panel";

export const dynamic = "force-dynamic";

export default async function CenterSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ centerId?: string }>;
}) {
  await requireTutorPage();
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Center settings"
        description="Update the name, location, subjects, and levels for this center."
      />
      <CenterSettingsPanel preferredCenterId={params.centerId ?? null} />
    </>
  );
}
