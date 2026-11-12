import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { needsEmailVerification } from "@/lib/email-verification";
import { VerifyEmailGate } from "@/components/auth/verify-email-gate";

export const dynamic = "force-dynamic";

function isSafeCallbackUrl(url: string | undefined): url is string {
  return Boolean(
    url && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\"),
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  // Registration sends `?sent=1`: the backend already emailed the code, so the
  // page must not send another. Join (etc.) may pass `callbackUrl`.
  searchParams: Promise<{ sent?: string; callbackUrl?: string }>;
}) {
  const user = await getSessionUser();
  if (!user?.id) redirect("/login");

  const { sent, callbackUrl } = await searchParams;
  const next = isSafeCallbackUrl(callbackUrl) ? callbackUrl : "/dashboard";

  // Verified (or nothing to verify): nothing to do here. Also what lets the
  // student leave after verifying, since the session is re-read on this request.
  if (!needsEmailVerification(user) || !user.email) redirect(next);

  return (
    <VerifyEmailGate
      email={user.email}
      alreadySent={sent === "1"}
      successHref={next}
    />
  );
}
