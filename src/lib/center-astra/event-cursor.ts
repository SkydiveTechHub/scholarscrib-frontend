const MAX_IDS = 400;

function storageKey(centerId: string, threadId: string) {
  return `center-astra-event-ids:${centerId}:${threadId}`;
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
 * Event ids already applied for one center Astra thread. A rejoin skips ids
 * in this list and sends the last one as `Last-Event-ID`. Kept apart from
 * student and admin Astra cursors.
 */
export function createCenterEventCursor(
  centerId: string,
  threadId: string,
  storage: Storage | null,
) {
  const key = storageKey(centerId, threadId);
  let seen = readIds(storage, key);
  return {
    centerId,
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

export type CenterEventCursor = ReturnType<typeof createCenterEventCursor>;

export function browserEventStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}
