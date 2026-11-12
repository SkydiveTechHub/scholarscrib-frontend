"use client";

import { useState } from "react";
import { LuCheck, LuCopy, LuShare2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  resolveInviteUrl,
  whatsappInviteUrl,
} from "@/lib/center-invite";
import { cn } from "@/lib/utils";

export function CenterInviteShare({
  centerName,
  code,
  url,
  className,
}: {
  centerName: string;
  code: string;
  url?: string | null;
  className?: string;
}) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const link = resolveInviteUrl({ code, url });

  async function copy(kind: "link" | "code", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard may be blocked; the text is still visible to select.
    }
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Invite students</p>
        <p className="mt-1 text-sm text-muted">
          Share this link on WhatsApp. Students open it, read what you can see,
          then accept.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          Invite link
        </label>
        <div className="flex gap-2">
          <input
            readOnly
            value={link}
            className="min-w-0 flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => copy("link", link)}
            aria-label="Copy invite link"
          >
            {copied === "link" ? (
              <LuCheck className="h-4 w-4" />
            ) : (
              <LuCopy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          Short code
        </label>
        <div className="flex gap-2">
          <input
            readOnly
            value={code}
            className="min-w-0 flex-1 rounded-xl border border-border bg-secondary px-3 py-2 font-mono text-sm tracking-wider text-foreground"
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => copy("code", code)}
            aria-label="Copy short code"
          >
            {copied === "code" ? (
              <LuCheck className="h-4 w-4" />
            ) : (
              <LuCopy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <a
        href={whatsappInviteUrl({ centerName, code })}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition-colors hover:brightness-105"
      >
        <LuShare2 className="h-4 w-4" />
        Share on WhatsApp
      </a>
    </div>
  );
}
