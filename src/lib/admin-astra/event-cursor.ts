const MAX_IDS = 400;

function storageKey(threadId: string) {
  return `admin-astra-event-ids:${threadId}`;
}

function readIds(storage: Storage | null, key: string): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === "string" && id !== "")
      .slice(-MAX_IDS);
  } catch {
    return [];
  }
}

/**
 * Event ids already applied for one admin thread. A rejoin skips ids in this
 * list and sends the last one as `Last-Event-ID`. Kept apart from the student
 * tutor cursor so the same id cannot suppress the other product.
 */
export function createAdminEventCursor(threadId: string, storage: Storage | null) {
  const key = storageKey(threadId);
  let seen = readIds(storage, key);
  return {
    threadId,
    accept(id: string | undefined): boolean {
      if (!id) return true;
      if (seen.includes(id)) return false;
      seen = [...seen, id].slice(-MAX_IDS);
      storage?.setItem(key, JSON.stringify(seen));
      return true;
    },
    lastId(): string | null {
      return seen[seen.length - 1] ?? null;
    },
    clear() {
      seen = [];
      storage?.removeItem(key);
    },
  };
}

export type AdminEventCursor = ReturnType<typeof createAdminEventCursor>;

export function browserEventStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}
