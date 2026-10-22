import { requireAdminPage } from "@/lib/admin-session";
import { AdminAstraApp } from "@/components/admin/astra/admin-astra-app";

export const dynamic = "force-dynamic";

export default async function AdminAstraPage() {
  const admin = await requireAdminPage();
  return <AdminAstraApp isOwner={admin.isOwner} />;
}
