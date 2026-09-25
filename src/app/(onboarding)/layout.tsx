import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Logo } from "@/components/ui/logo";
import { NOINDEX } from "@/lib/seo/metadata";

export const metadata = NOINDEX;

// Signed in but not yet through to the dashboard. Deliberately outside the
// (dashboard) group: that layout redirects incomplete profiles here, and
// sharing it would loop.
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user?.id) redirect("/login");

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-10 lg:py-16">
      <Logo href={null} className="mb-10" />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}