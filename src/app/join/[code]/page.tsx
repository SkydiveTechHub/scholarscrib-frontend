import type { Metadata } from "next";
import { JoinConsentScreen } from "@/components/center-app/join-consent-screen";
import { NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...NOINDEX,
  title: "Join a center — ScholarsCrib",
};

/**
 * Invite landing. Auth is optional for reading the consent copy; accepting
 * requires a student session (handled inside the client screen).
 */
export default async function JoinCenterPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="min-h-full bg-background">
      <JoinConsentScreen code={decodeURIComponent(code)} />
    </main>
  );
}
