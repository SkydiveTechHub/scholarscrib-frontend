import { NOINDEX } from "@/lib/seo/metadata";

export const metadata = NOINDEX;

/**
 * Minimal chrome for tutor onboarding steps (email verify). Cookie path is
 * `/center`, so these routes live under `/center/*`. Unlike (entry), signed-in
 * tutors are allowed here; unlike (console), there is no app shell.
 */
export default function CenterOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      {children}
    </div>
  );
}
