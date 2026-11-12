import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { CenterTeamPanel } from "@/components/center-app/center-team-panel";

export const dynamic = "force-dynamic";

export default async function CenterTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ centerId?: string }>;
}) {
  await requireTutorPage();
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Team"
        description="Invite facilitators on Pro or Team. They can run roster and assignments; only you manage billing."
      />
      <CenterTeamPanel preferredCenterId={params.centerId ?? null} />
    </>
  );
}
