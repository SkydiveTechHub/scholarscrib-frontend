"use client";

import { LuLogOut } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { tutorLogout } from "@/lib/client-session";

/** Signs out of the tutor realm only. Student/admin cookies are untouched. */
export function CenterSignOut({ className }: { className?: string }) {
  function handleSignOut() {
    void tutorLogout();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground",
        className,
      )}
    >
      <LuLogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  );
}
