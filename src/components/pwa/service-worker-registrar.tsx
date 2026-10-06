"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and renders nothing.
 *
 * Two deliberate omissions. There is no reload on "controllerchange": a silent
 * reload discards a half-finished quiz. And there is no messaging to make the
 * waiting worker activate early — the worker itself does not call
 * skipWaiting(), so a new version takes over when every tab has closed, rather
 * than swapping itself in under a student mid-exam.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Never in development. The worker serves /_next/static/ cache-first,
    // which is only safe because production chunk names are content-hashed;
    // `next dev` reuses one chunk name across edits, so a worker left running
    // keeps serving code from before the change. One already installed is
    // removed along with its caches, so the next reload is fresh.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .then(() => caches.keys())
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("scholarscrib-"))
              .map((key) => caches.delete(key)),
          ),
        )
        .catch(() => {
          // Nothing registered, or storage is blocked. Either way, nothing to undo.
        });
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    // updateViaCache: "none" so the browser's HTTP cache can never hand the
    // registration a stale worker script. The no-store header on /sw.js says
    // the same thing; both, because either one alone has been known to lose.
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
      })
      .catch((error) => {
        // A failed registration must cost nothing: the app keeps working
        // exactly as it did before this feature existed.
        console.error("Service worker registration failed", error);
      });

    // Checking on tab focus rather than on an interval: a student who leaves
    // the app open for a week still picks up a new version on their next
    // glance, and a background tab does no work.
    const checkForUpdate = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => {
          // Offline, or the server is down. Nothing to do and nothing to say.
        });
      }
    };

    document.addEventListener("visibilitychange", checkForUpdate);
    return () => document.removeEventListener("visibilitychange", checkForUpdate);
  }, []);

  return null;
}
