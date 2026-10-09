import { requireAdminPage } from "@/lib/admin-session";
import { PageHeader } from "@/components/ui/page-header";
import { CurriculumManager } from "@/components/admin/curriculum/curriculum-manager";

export const dynamic = "force-dynamic";

export default async function AdminCurriculumPage() {
  // The layout's check does not re-run on client-side navigation between admin
  // routes, so each page carries its own.
  const admin = await requireAdminPage();

  return (
    <div>
      <PageHeader
        title="Curriculum"
        description={
          admin.isOwner
            ? "Subjects, the SS1–SS3 term slots each one is taught in, and the topics inside every slot."
            : "Subjects, the term slots each one is taught in, and the topics inside them. Only the owner can make changes."
        }
      />
      <CurriculumManager canEdit={admin.isOwner} />
    </div>
  );
}
