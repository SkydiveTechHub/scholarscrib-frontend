import { requireAdminPage } from "@/lib/admin-session";
import { PageHeader } from "@/components/ui/page-header";
import { listBillingCatalog } from "@/lib/admin-data";
import { BillingCatalogManager } from "@/components/admin/billing-catalog-manager";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  await requireAdminPage();
  const catalog = await listBillingCatalog();

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Edit plan prices and what each plan unlocks. Changes apply to live gates without a redeploy. Full ops guide: docs/billing-catalog-ops.md in the API repo."
      />
      <BillingCatalogManager catalog={catalog} />
    </div>
  );
}
