import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/admin-session";
import { canAccessConsole } from "@/lib/admin-access";
import { NOINDEX } from "@/lib/seo/metadata";

export const metadata = NOINDEX;

export default async function AdminEntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Signed-in admins belong in the console. This is the authoritative check —
  // proxy.ts lets /admin/login through — and it uses the same rule as
  // requireAdminPage(), so the two can never disagree and bounce each other.
  if (canAccessConsole(await getAdminPrincipal())) redirect("/admin");

  return children;
}
