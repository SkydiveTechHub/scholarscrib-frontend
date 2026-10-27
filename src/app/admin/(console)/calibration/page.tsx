import { requireAdminPage } from "@/lib/admin-session";
import { getCalibrationReport } from "@/lib/admin-calibration-data";
import {
  normaliseCalibrationFilter,
  type RawCalibrationParams,
} from "@/lib/admin-calibration";
import { CalibrationView } from "@/components/admin/calibration-view";

export const dynamic = "force-dynamic";

export default async function AdminCalibrationPage({
  searchParams,
}: {
  searchParams: Promise<RawCalibrationParams>;
}) {
  // The layout's check does not re-run on client-side navigation between admin
  // routes, so each page carries its own.
  await requireAdminPage();

  const filter = normaliseCalibrationFilter(await searchParams);
  const report = await getCalibrationReport(filter);
  return <CalibrationView report={report} filter={filter} />;
}
