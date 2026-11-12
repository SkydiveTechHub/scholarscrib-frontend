import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { MyCentersPanel } from "@/components/center-app/my-centers-panel";

export const metadata: Metadata = {
  title: "My centers — ScholarsCrib",
};

export default async function MyCentersPage() {
  const session = await getSessionUser();
  if (!session?.id) redirect("/login?callbackUrl=/my-centers");

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My centers"
        description="Centers you have joined, what each tutor can see, and Leave anytime."
      />
      <div className="max-w-2xl">
        <MyCentersPanel />
      </div>
    </div>
  );
}
