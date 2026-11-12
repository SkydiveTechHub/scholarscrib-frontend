import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { FacilitatorAcceptPanel } from "@/components/center-app/facilitator-accept-panel";

export const dynamic = "force-dynamic";

export default async function JoinTeamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireTutorPage();
  const { code } = await params;

  return (
    <>
      <PageHeader
        title="Join a center team"
        description="Accept a facilitator invite from a center owner."
      />
      <FacilitatorAcceptPanel code={decodeURIComponent(code)} />
    </>
  );
}
