import "server-only";

import { createHmac } from "node:crypto";

/**
 * HMAC-SHA256 of the student id with the Tawk property API key (Admin →
 * Property Settings). Required for `Tawk_API.login`. Returns null when the
 * key is unset so the widget can still load anonymously.
 */
export function createTawkLoginHash(userId: string): string | null {
  const key = process.env.TAWK_API_KEY?.trim();
  if (!key || !userId) return null;
  return createHmac("sha256", key).update(userId).digest("hex");
}
