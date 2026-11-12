import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LuBuilding2 } from "react-icons/lu";
import { getSessionUser } from "@/lib/session";
import { getSettingsProfile } from "@/lib/settings";
import { SubscriptionSection } from "@/components/settings/subscription-section";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ProfileForm } from "@/components/settings/profile-form";
import { AcademicForm } from "@/components/settings/academic-form";
import { PasswordForm } from "@/components/settings/password-form";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/button";
export const metadata: Metadata = {
  title: "Settings — ScholarsCrib",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSessionUser();
  // The layout already guards this, but the page reads by id and must not
  // fall through to a query with an undefined id.
  if (!session?.id) redirect("/login");

  const user = await getSettingsProfile();
  if (!user) redirect("/login");

  const { tab } = await searchParams;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your account and study preferences."
      />

      <div className="space-y-5 max-w-2xl">
        <SubscriptionSection userId={session.id} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-start gap-3">
            <LuBuilding2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">My centers</p>
              <p className="text-xs text-muted">
                See which tutors can view your assigned results, or leave a center.
              </p>
            </div>
          </div>
          <Link href="/my-centers" className={buttonClass("secondary", "sm")}>
            Open
          </Link>
        </div>

        <SettingsTabs
          initial={tab ?? "account"}
          tabs={[
            {
              id: "account",
              label: "Account",
              panel: (
                <>
                  <ProfileForm
                    email={user.email ?? null}
                    firstName={user.firstName ?? ""}
                    lastName={user.lastName ?? ""}
                    phone={user.phone ?? null}
                    state={user.state ?? null}
                    image={user.image ?? null}
                  />

                  {/* Google-only accounts have no password to change. */}
                  {user.hasPassword && <PasswordForm />}

                  <DeleteAccountSection
                    email={user.email ?? null}
                    hasPassword={user.hasPassword}
                  />

                </>
              ),
            },
            {
              id: "study",
              label: "Study",
              panel: (
                <>
                  <AcademicForm classLevel={user.classLevel ?? null} track={user.track ?? null} />

                  <NotificationsSection userId={session.id} />
                </>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
