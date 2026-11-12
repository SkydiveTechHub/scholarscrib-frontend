/**
 * Which center the tutor console is operating on when the account staffs
 * more than one. Survives navigation via localStorage (same browser profile).
 */

export const ACTIVE_CENTER_STORAGE_KEY = "sc.active_center_id";

export function readStoredActiveCenterId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ACTIVE_CENTER_STORAGE_KEY);
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function writeStoredActiveCenterId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_CENTER_STORAGE_KEY, id);
  } catch {
    // Private mode / quota — panels still work with in-memory selection.
  }
}

export function pickActiveCenter<T extends { id: string }>(
  centers: T[],
  preferredId?: string | null,
): T | null {
  if (!centers.length) return null;
  if (preferredId) {
    const match = centers.find((c) => c.id === preferredId);
    if (match) return match;
  }
  const stored = readStoredActiveCenterId();
  if (stored) {
    const match = centers.find((c) => c.id === stored);
    if (match) return match;
  }
  return centers[0] ?? null;
}
