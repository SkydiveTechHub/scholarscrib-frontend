import { redirect } from "next/navigation";
import { isCenterPath } from "@/lib/center-route";
import { getTutorSession } from "@/lib/session";
import { needsEmailVerification } from "@/lib/email-verification";
import { VerifyEmailGate } from "@/components/auth/verify-email-gate";

export const dynamic = "force-dynamic";

export default async function CenterVerifyEmailPage({
  searchParams,
}: {
  // Registration sends `?sent=1`: the backend already emailed the code, so the
  // page must not send another. Login may pass `callbackUrl` under `/center`.
  searchParams: Promise<{ sent?: string; callbackUrl?: string }>;
}) {
  const session = await getTutorSession();
  const user = session?.user;
  if (!user?.id) redirect("/center/login");

  const { sent, callbackUrl } = await searchParams;
  const next =
    callbackUrl && isCenterPath(callbackUrl) ? callbackUrl : "/center";

  // Verified (or nothing to verify): nothing to do here. Also what lets the
  // tutor leave after verifying, since the session is re-read on this request.
  if (!needsEmailVerification(user) || !user.email) redirect(next);

  return (
    <VerifyEmailGate
      email={user.email}
      alreadySent={sent === "1"}
      successHref={next}
      realm="tutor"
    />
  );
}
