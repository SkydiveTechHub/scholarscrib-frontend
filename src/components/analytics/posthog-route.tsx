"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { syncPostHogRecording } from "@/lib/posthog-browser";

/** Stops session recording on the admin console. Student routes keep it on. */
export function PostHogRoute() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) syncPostHogRecording(pathname);
  }, [pathname]);

  return null;
}
