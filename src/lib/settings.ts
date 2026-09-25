import { api } from "@/lib/api/server";
import { isApiError } from "@/lib/api/errors";
import type { SettingsProfileOut } from "@/lib/api/types";

/**
 * The settings page's profile, read fresh from `GET /api/user/profile` rather
 * than the cached session so the form always shows the last saved values after
 * `router.refresh()`. Returns null when the token no longer authorizes, which
 * the caller treats as signed out.
 */
export async function getSettingsProfile(): Promise<SettingsProfileOut | null> {
  try {
    return await api<SettingsProfileOut>("/api/user/profile");
  } catch (error) {
    if (isApiError(error) && error.isAuthFailure) return null;
    throw error;
  }
}