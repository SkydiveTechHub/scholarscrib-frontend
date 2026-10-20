"use client";

import { useEffect } from "react";
import { syncThisDevice } from "@/lib/push-client";

const RESYNC_AFTER_MS = 5 * 60_000;

/**
 * Renders nothing. Registers this device with the backend on load, when the
 * connection returns, and when the tab is brought back after a while.
 */
export function PushSync() {
  useEffect(() => {
    let last = 0;
    const run = () => {
      last = Date.now();
      void syncThisDevice();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > RESYNC_AFTER_MS) run();
    };
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
