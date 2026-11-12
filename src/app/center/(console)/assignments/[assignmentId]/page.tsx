import { requireTutorPage } from "@/lib/center-session";
import { CenterAssignmentDetail } from "@/components/center-app/center-assignment-detail";

export const dynamic = "force-dynamic";

export default async function CenterAssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  await requireTutorPage();
  const { assignmentId } = await params;

  return <CenterAssignmentDetail assignmentId={assignmentId} />;
}
