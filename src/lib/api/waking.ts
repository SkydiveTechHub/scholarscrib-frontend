/**
 * Tracks requests that are riding out a backend cold start (the API answered
 * 503 `db_waking` and the client is retrying). A counter, not a boolean, so
 * overlapping requests don't clear each other's state.
 */
"use client";

import { useSyncExternalStore } from "react";

let pending = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function beginWaking(): void {
  pending += 1;
  emit();
}

export function endWaking(): void {
  pending = Math.max(0, pending - 1);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True while any request is waiting for the backend to wake up. */
export function useBackendWaking(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => pending > 0,
    () => false,
  );
}
