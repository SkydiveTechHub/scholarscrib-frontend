import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getSettingsProfile } from "@/lib/settings";
import { SubscriptionSection } from "@/components/settings/subscription-section";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ProfileForm } from "@/components/settings/profile-form";
import { AcademicForm } from "@/components/settings/academic-form";
import { PasswordForm } from "@/components/settings/password-form";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { PageHeader } from "@/components/ui/page-header";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";

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
        {!user.emailVerified && user.email && (
          <VerifyEmailBanner email={user.email} />
        )}

        <SubscriptionSection userId={session.id} />

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
                    emailVerified={!!user.emailVerified}
                    firstName={user.firstName ?? ""}
                    lastName={user.lastName ?? ""}
                    phone={user.phone ?? null}
                    state={user.state ?? null}
                    image={user.image ?? null}
                  />

                  {/* Google-only accounts have no password to change. */}
                  {user.hasPassword && <PasswordForm />}
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
