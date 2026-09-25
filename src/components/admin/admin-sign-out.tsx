"use client";

import { LuLogOut } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/lib/client-session";

// Signs out of the admin session only. The student cookie has a different name
// and a different scope, so a student session in another tab survives this.
export function AdminSignOut({ className }: { className?: string }) {
  function handleSignOut() {
    void adminLogout();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors",
        className,
      )}
    >
      <LuLogOut className="w-3.5 h-3.5" />
      Sign out
    </button>
  );
}