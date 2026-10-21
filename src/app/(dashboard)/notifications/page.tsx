import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Notifications — ScholarsCrib",
};

export default function NotificationsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notifications"
        description="Study reminders and announcements from ScholarsCrib."
      />
      {/* `useSearchParams` in the view needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <NotificationsView />
      </Suspense>
    </div>
  );
}
