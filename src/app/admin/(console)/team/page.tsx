import { api } from "@/lib/api/server";
import type { AdminsOut } from "@/lib/api/types";
import { requireOwnerPage } from "@/lib/admin-session";
import { PageHeader } from "@/components/ui/page-header";
import { AdminTeamManager, type TeamAdmin } from "@/components/admin/admin-team-manager";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const owner = await requireOwnerPage();

  const { admins } = await api<AdminsOut>("/admin/api/admins", { realm: "admin" });
  // // backend-ported: `AdminsOut` (`AdminRowOut`) has no createdAt. Standing in
  // for the old `createdAt.toISOString()` sort key with the epoch keeps the
  // manager's row rendering stable; the backend is expected to already order
  // owners first.
  const initialAdmins: TeamAdmin[] = (admins ?? []).map((a) => ({
    id: a.id,
    email: a.email ?? null,
    username: a.username ?? null,
    isOwner: a.isOwner,
    isActive: a.isActive,
    lastLoginAt: a.lastLoginAt ?? null,
    createdAt: new Date(0).toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Team"
        description="Create admin accounts and hand the credentials over yourself. There is no invite email."
      />
      <AdminTeamManager
        initialAdmins={initialAdmins}
        currentAdminId={owner.id}
      />
    </div>
  );
}
