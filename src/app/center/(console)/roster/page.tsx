import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { CenterRosterPanel } from "@/components/center-app/center-roster-panel";

export const dynamic = "force-dynamic";

export default async function CenterRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ centerId?: string }>;
}) {
  await requireTutorPage();
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Roster"
        description="Invite students, organise groups, and manage who is in your center."
      />
      <CenterRosterPanel preferredCenterId={params.centerId ?? null} />
    </>
  );
}
