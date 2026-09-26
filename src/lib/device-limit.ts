/**
 * Device-limit display helpers for the settings page. Paid accounts may hold
 * DEVICE_LIMIT sign-ins at once; the backend enforces it and signs out the
 * least recently used device.
 *
 * See docs/superpowers/specs/2026-09-13-device-limit-design.md
 */

import { hasAtLeast, type SubscriptionTier } from "@/lib/subscription";

export const DEVICE_LIMIT = 2;

/** Freemium is unlimited: a shared free account costs nothing. */
export function isDeviceLimited(tier: SubscriptionTier): boolean {
  return hasAtLeast({ tier }, "STANDARD");
}

/**
 * Coarse on purpose: lastSeenAt is only written every 15 minutes, so anything
 * finer would be false precision.
 */
export function formatLastActive(lastSeenAt: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - lastSeenAt.getTime()) / 60_000);
  if (minutes < 15) return "Active recently";
  if (minutes < 60) return `Last active ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last active ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Last active ${days} day${days === 1 ? "" : "s"} ago`;
}
