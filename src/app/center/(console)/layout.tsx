import { LuBuilding2 } from "react-icons/lu";
import { requireTutorPage } from "@/lib/center-session";
import { SessionGuard } from "@/components/auth/session-guard";
import { ActiveCenterProvider } from "@/components/center-app/active-center-provider";
import { CenterNav } from "@/components/center-app/center-nav";
import { CenterSignOut } from "@/components/center-app/center-sign-out";
import { CenterSettingsLink } from "@/components/center-app/center-settings-link";
import { CenterSwitcher } from "@/components/center-app/center-switcher";
import { NOINDEX } from "@/lib/seo/metadata";

export const metadata = NOINDEX;

export default async function CenterConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Chrome only. Each page can call requireTutorPage() itself — Partial
  // Rendering means this layout does not re-run on client-side navigation
  // between center routes, so it cannot be the sole wall.
  await requireTutorPage();

  return (
    <ActiveCenterProvider>
      <div className="min-h-full">
        <SessionGuard realm="tutor" />
        <a
          href="#center-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 lg:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <LuBuilding2 className="h-5 w-5 flex-shrink-0 text-primary" />
            <CenterSwitcher compact showFallback className="min-w-0 flex-1" />
            <CenterSettingsLink />
          </div>
          <CenterSignOut className="w-auto flex-shrink-0" />
        </header>

        <div className="flex min-h-full">
          <aside className="sticky top-0 hidden h-screen w-56 flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-card lg:flex">
            <div className="space-y-3 border-b border-border px-4 py-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LuBuilding2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    Centers
                  </span>
                </div>
                <CenterSettingsLink />
              </div>
              <CenterSwitcher />
            </div>
            <CenterNav variant="sidebar" />
            <div className="mt-3 border-t border-border px-3 pt-3">
              <CenterSignOut />
            </div>
          </aside>

          <main
            id="center-main"
            tabIndex={-1}
            className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"
          >
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>

        <CenterNav variant="mobile" />
      </div>
    </ActiveCenterProvider>
  );
}
