import { requireTutorPage } from "@/lib/center-session";
import { CenterStudentDetail } from "@/components/center-app/center-student-detail";

export const dynamic = "force-dynamic";

export default async function CenterStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireTutorPage();
  const { studentId } = await params;

  return <CenterStudentDetail studentId={studentId} />;
}
