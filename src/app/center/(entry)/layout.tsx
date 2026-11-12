import { redirect } from "next/navigation";
import { getTutorPrincipal } from "@/lib/center-session";
import { needsEmailVerification } from "@/lib/email-verification";
import { NOINDEX } from "@/lib/seo/metadata";

export const metadata = NOINDEX;

export default async function CenterEntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Signed-in tutors leave login. Unverified go to the OTP step first —
  // proxy.ts lets /center/login through; this is the authoritative check.
  const tutor = await getTutorPrincipal();
  if (tutor) {
    redirect(
      needsEmailVerification(tutor)
        ? "/center/verify-email"
        : "/center",
    );
  }

  return children;
}
