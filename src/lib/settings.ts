import { cache } from "react";
import { api } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import type { SettingsProfileOut } from "@/lib/api/types";

/**
 * The settings page's profile, read fresh from `GET /api/user/profile` rather
 * than the cached session so the form always shows the last saved values after
 * `router.refresh()`. Returns null when the token no longer authorizes, which
 * the caller treats as signed out.
 *
 * Cached per request so Settings sections that each need the profile (forms,
 * subscription, devices) share one round trip.
 */
export const getSettingsProfile = cache(
  async (): Promise<SettingsProfileOut | null> => {
    try {
      return await api<SettingsProfileOut>(endpoints.user.profile);
    } catch (error) {
      if (isApiError(error) && error.isAuthFailure) return null;
      throw error;
    }
  },
);
