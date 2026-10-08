import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/session";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNav } from "@/components/ui/mobile-nav";
import { MobileHeader } from "@/components/ui/mobile-header";
import { SessionGuard } from "@/components/auth/session-guard";
import { PushSync } from "@/components/push/push-sync";
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";
import type { ProfileUser } from "@/components/ui/user-menu";
import { daysUntilExam, examTargetFor } from "@/lib/exam-target";
import { NOINDEX } from "@/lib/seo/metadata";
import { needsProfileCompletion } from "@/lib/profile-completion";

// Nothing under here is useful in a search result, and an indexed login wall
// is a ranking liability. Async layouts can still export static metadata.
export const metadata = NOINDEX;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative guard. The proxy check is optimistic and can be bypassed by
  // a stale or forged cookie surviving long enough to reach the app. Every
  // request here re-reads the session against the backend, so a revoked or
  // displaced session (device limit, force sign-out) resolves to an
  // authentication failure and this redirect.
  const user = await getSessionUser();
  if (!user?.id) redirect("/login");

  // Class, track and state come before anything else: most pages here assume
  // the first two, and Google sign-ups arrive with none of them.
  if (needsProfileCompletion(user)) redirect("/complete-profile");

  // Derived from the student's own class level rather than hard-coded, and
  // computed here on the server: deriving it inside the client components ran
  // it against two different clocks — once during SSR, once on hydration.
  const now = new Date();
  const examTarget = examTargetFor({ classLevel: user.classLevel, now });
  const daysToExam = daysUntilExam(examTarget, now);

  return (
    <div className="min-h-full">
      <SessionGuard realm="student" />
      <PushSync />
      <Sidebar
        user={user as ProfileUser}
        examLabel={examTarget.label}
        daysToExam={daysToExam}
      />
      <MobileHeader
        user={user as ProfileUser}
        examLabel={examTarget.label}
        daysToExam={daysToExam}
      />
      <MobileNav />

      {/* Main content — offset by sidebar on desktop */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Streams in: a slow pooler connection must not hold up the page. */}
          <Suspense fallback={null}>
            <AnnouncementBanner />
          </Suspense>
          {children}
        </div>
      </main>
    </div>
  );
}