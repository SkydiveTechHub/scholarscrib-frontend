import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AssignedAssignmentPlayer } from "@/components/center-app/assigned-assignment-player";

export const metadata: Metadata = {
  title: "Assignment — ScholarsCrib",
};

export default async function AssignedAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login?callbackUrl=/assigned");

  const { assignmentId } = await params;
  return <AssignedAssignmentPlayer assignmentId={assignmentId} />;
}
