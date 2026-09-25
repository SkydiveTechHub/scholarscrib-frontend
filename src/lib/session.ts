/**
 * Server-side session reads. The dashboard, onboarding and admin layouts used
 * to call Auth.js's `auth()`; now they ask the backend for the session and
 * cache the answer per request so a page tree that guards several times only
 * pays one round trip. A missing or rejected token comes back as `null`, which
 * the layouts treat as "signed out".
 */
import "server-only";

import { cache } from "react";
import { api } from "@/lib/api/server";
import { isApiError } from "@/lib/api/errors";
import type {
  AdminSessionOut,
  SessionOut,
  SessionUserOut,
} from "@/lib/api/types";

/**
 * The signed-in student, or null. A 401/403 (expired token, revoked device,
 * suspended account) is a signed-out state, not an error — the UI must not
 * crash on it.
 */
export const getSession = cache(async (): Promise<SessionOut | null> => {
  try {
    return await api<SessionOut>("/api/auth/session");
  } catch (error) {
    if (isApiError(error) && error.isAuthFailure) return null;
    throw error;
  }
});

/** Convenience: the session's user object, or null. */
export const getSessionUser = cache(async (): Promise<SessionUserOut | null> => {
  const session = await getSession();
  return session?.user ?? null;
});

/** The signed-in admin, or null. Admin actions re-read the row on the backend. */
export const getAdminSession = cache(async (): Promise<AdminSessionOut | null> => {
  try {
    return await api<AdminSessionOut>("/admin/api/auth/session");
  } catch (error) {
    if (isApiError(error) && error.isAuthFailure) return null;
    throw error;
  }
});