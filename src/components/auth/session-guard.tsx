"use client";

import { useEffect } from "react";
import { getAccessToken } from "@/lib/api/client";

/**
 * Sends the visitor to sign in when the page is on screen without its token.
 * Covers what the server guards cannot see: the back button restoring a
 * signed-in page from the browser's back/forward cache after sign-out, and a
 * tab left open after another tab signed out.
 */
export function SessionGuard({ realm }: { realm: "student" | "admin" }) {
  useEffect(() => {
    const loginPath = realm === "admin" ? "/admin/login" : "/login";

    function check() {
      if (!getAccessToken(undefined, realm)) {
        window.location.replace(loginPath);
      }
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) check();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") check();
    }

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [realm]);

  return null;
}
