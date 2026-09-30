import { getSettingsProfile } from "@/lib/settings";
import { DEVICE_LIMIT } from "./device-limit";

/**
 * Device reads for the app. Registering, touching and revoking devices all
 * happen on the backend during sign-in and via its own endpoints; the app only
 * lists what the backend reports for this caller.
 *
 * Listing comes from `GET /api/user/profile` (`SettingsProfileOut.devices`).
 * `POST /api/user/devices` is revoke-only — a GET there returns 405.
 */

export type ActiveDevice = {
  id: string;
  label: string | null;
  lastSeenAt: string | null;
};

/**
 * The caller's active devices, newest activity first. The backend resolves
 * them from the token; `SettingsProfileOut.devices` carries the same rows the
 * Settings profile read uses.
 */
export async function listActiveDevices(_userId: string): Promise<ActiveDevice[]> {
  const profile = await getSettingsProfile();
  return (profile?.devices ?? []).map((device) => ({
    id: device.id,
    label: device.label ?? null,
    lastSeenAt: device.lastSeenAt ?? null,
  }));
}

export { DEVICE_LIMIT };
