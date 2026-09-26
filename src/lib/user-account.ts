import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import type { SettingsProfileOut } from "@/lib/api/types";

/**
 * The fields /complete-profile asks for, read fresh from the backend rather
 * than the cached session — the dashboard gate may be acting on a stale cache,
 * and only the profile endpoint can say the step is already done.
 */
export async function getProfileCompletionFields() {
  const profile = await api<SettingsProfileOut>(endpoints.user.profile);
  return {
    firstName: profile.firstName ?? null,
    classLevel: profile.classLevel ?? null,
    track: profile.track ?? null,
    state: profile.state ?? null,
  };
}