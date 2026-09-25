import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getSettingsProfile } from "@/lib/settings";
import { SubscriptionSection } from "@/components/settings/subscription-section";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { ProfileForm } from "@/components/settings/profile-form";
import { AcademicForm } from "@/components/settings/academic-form";
import { PasswordForm } from "@/components/settings/password-form";
import { DevicesSection } from "@/components/settings/devices-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Settings — ScholarsCrib",
};

export default async function SettingsPage() {
  const session = await getSessionUser();
  // The layout already guards this, but the page reads by id and must not
  // fall through to a query with an undefined id.
  if (!session?.id) redirect("/login");

  const user = await getSettingsProfile();
  if (!user) redirect("/login");

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your account and study preferences."
      />

      <div className="space-y-5 max-w-2xl">
        <SubscriptionSection userId={session.id} />

        <DevicesSection
          userId={session.id}
          currentDeviceId={session.deviceId ?? undefined}
        />

        <NotificationsSection userId={session.id} />

        <AvatarUpload
          image={user.image ?? null}
          firstName={user.firstName ?? ""}
          lastName={user.lastName ?? ""}
        />

        <ProfileForm
          email={user.email ?? null}
          firstName={user.firstName ?? ""}
          lastName={user.lastName ?? ""}
          phone={user.phone ?? null}
          state={user.state ?? null}
        />

        <AcademicForm classLevel={user.classLevel ?? null} track={user.track ?? null} />

        {/* Google-only accounts have no password to change. */}
        {user.hasPassword && <PasswordForm />}
      </div>
    </div>
  );
}
