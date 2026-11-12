import { redirect } from "next/navigation";
import { getTutorSession } from "@/lib/session";
import { needsEmailVerification } from "@/lib/email-verification";

/**
 * Tutor identity resolution. The proxy check is optimistic and can be outrun
 * by a stale cookie; this — the backend session re-read — is the wall.
 */

export type TutorPrincipal = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: string | null;
};

export async function getTutorPrincipal(): Promise<TutorPrincipal | null> {
  const session = await getTutorSession();
  const user = session?.user;
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
  };
}

export async function requireTutorPage(): Promise<TutorPrincipal> {
  const tutor = await getTutorPrincipal();
  if (!tutor) redirect("/center/login");
  // Same gate as the student dashboard: unverified tutors stay on the OTP step.
  if (needsEmailVerification(tutor)) redirect("/center/verify-email");
  return tutor;
}
