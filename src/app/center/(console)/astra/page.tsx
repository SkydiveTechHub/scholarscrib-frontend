import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { CenterAstraPanel } from "@/components/center-app/center-astra-panel";

export const dynamic = "force-dynamic";

export default async function CenterAstraPage({
  searchParams,
}: {
  searchParams: Promise<{ centerId?: string }>;
}) {
  await requireTutorPage();
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Astra"
        description="Ask about assignment results and draft follow-up work. Publishing or sending always needs your confirmation."
      />
      <CenterAstraPanel preferredCenterId={params.centerId ?? null} />
    </>
  );
}
