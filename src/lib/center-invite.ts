/**
 * Build join URLs and WhatsApp share text for center invites.
 */

export function joinPathForCode(code: string): string {
  return `/join/${encodeURIComponent(code)}`;
}

export function joinUrlForCode(code: string, origin?: string): string {
  const path = joinPathForCode(code);
  if (origin) return `${origin.replace(/\/+$/, "")}${path}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

/** Facilitator accept path (BE `_facilitator_invite_link`). */
export function facilitatorJoinPathForCode(code: string): string {
  return `/center/join-team/${encodeURIComponent(code)}`;
}

export function facilitatorJoinUrlForCode(
  code: string,
  origin?: string,
): string {
  const path = facilitatorJoinPathForCode(code);
  if (origin) return `${origin.replace(/\/+$/, "")}${path}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

export function whatsappInviteUrl(opts: {
  centerName: string;
  code: string;
  origin?: string;
}): string {
  const link = joinUrlForCode(opts.code, opts.origin);
  const text = `Join my ScholarsCrib center "${opts.centerName}" with this link: ${link}\n\nOr open ScholarsCrib and enter code: ${opts.code}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function whatsappFacilitatorInviteUrl(opts: {
  centerName: string;
  code: string;
  link?: string | null;
  origin?: string;
}): string {
  const link =
    opts.link && opts.link.startsWith("http")
      ? opts.link
      : facilitatorJoinUrlForCode(opts.code, opts.origin);
  const text = `Join my ScholarsCrib center team "${opts.centerName}" as a facilitator: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Prefer API-provided `link` / `url`; otherwise build from short code. */
export function resolveInviteUrl(
  invite: { code: string; link?: string | null; url?: string | null },
  origin?: string,
): string {
  const raw = invite.link || invite.url;
  if (raw) {
    if (raw.startsWith("http")) return raw;
    const base =
      origin ?? (typeof window !== "undefined" ? window.location.origin : "");
    return `${base.replace(/\/+$/, "")}${raw.startsWith("/") ? "" : "/"}${raw}`;
  }
  return joinUrlForCode(invite.code, origin);
}

/** Prefer BE `link` / `url`; else build `/center/join-team/{code}`. */
export function resolveFacilitatorInviteUrl(
  invite: { code: string; link?: string | null; url?: string | null },
  origin?: string,
): string {
  const raw = invite.link || invite.url;
  if (raw) {
    if (raw.startsWith("http")) return raw;
    const base =
      origin ?? (typeof window !== "undefined" ? window.location.origin : "");
    return `${base.replace(/\/+$/, "")}${raw.startsWith("/") ? "" : "/"}${raw}`;
  }
  return facilitatorJoinUrlForCode(invite.code, origin);
}
