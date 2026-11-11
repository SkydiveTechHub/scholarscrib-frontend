"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { syncTawkVisibility } from "@/lib/tawk-browser";

/** Hides the chat bubble on the admin console. Student routes keep it on. */
export function TawkRoute() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) syncTawkVisibility({ pathname });
  }, [pathname]);

  return null;
}
