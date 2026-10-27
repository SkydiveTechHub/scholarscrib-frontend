import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import {
  calibrationApiParams,
  parseCalibrationReport,
  type CalibrationFilter,
  type CalibrationReport,
} from "@/lib/admin-calibration";

/**
 * Backend read for the calibration page: `GET /admin/api/calibration`.
 * The scoring happens on the backend; this only passes the filter through and
 * reads the answer defensively.
 */
export async function getCalibrationReport(
  filter: CalibrationFilter,
): Promise<CalibrationReport> {
  return parseCalibrationReport(
    await api<unknown>(endpoints.admin.calibration, {
      realm: "admin",
      params: calibrationApiParams(filter),
    }),
  );
}
