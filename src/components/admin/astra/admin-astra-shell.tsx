"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LuStar } from "react-icons/lu";
import { adminAstraLauncherVisible } from "@/lib/admin-astra/launcher";
import { cn } from "@/lib/utils";

const AdminAstraPanel = dynamic(() => import("./admin-astra-panel"), { ssr: false });

export function AdminAstraShell({
  isOwner,
  children,
}: {
  isOwner: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    if (!adminAstraLauncherVisible(pathname)) setOpen(false);
  }
  const showLauncher = adminAstraLauncherVisible(pathname);
  const visible = open && showLauncher;

  return (
    <>
      <div className={cn(visible && "min-[1440px]:pr-[400px]")}>{children}</div>
      {showLauncher && !visible && (
        <button
          type="button"
          data-admin-astra-trigger
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg lg:bottom-6"
        >
          <LuStar className="h-4 w-4" aria-hidden />
          Ask Astra
        </button>
      )}
      {visible && <AdminAstraPanel isOwner={isOwner} onClose={() => setOpen(false)} />}
    </>
  );
}
