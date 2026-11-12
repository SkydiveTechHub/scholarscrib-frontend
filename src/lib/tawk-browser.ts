import { isAdminAnalyticsPath } from "@/lib/posthog-privacy";

type TawkLoginData = {
  hash: string;
  userId: string;
  name?: string | { first: string; last: string };
  email?: string;
  [key: string]: string | { first: string; last: string } | undefined;
};

type TawkApi = {
  onLoad?: () => void;
  login?: (data: TawkLoginData, callback?: (error?: unknown) => void) => void;
  logout?: (callback?: (error?: unknown) => void) => void;
  hideWidget?: () => void;
  showWidget?: () => void;
  setAttributes?: (
    attributes: Record<string, string>,
    callback?: (error?: unknown) => void,
  ) => void;
  customStyle?: { zIndex?: number | string };
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
    __tawkReady?: boolean;
  }
}

export type TawkVisitorProfile = {
  userId: string;
  hash: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  classLevel?: string | null;
  track?: string | null;
  state?: string | null;
  tier?: string | null;
};

type VisibilityState = {
  pathname: string;
  tutorOpen: boolean;
  examActive: boolean;
};

const visibility: VisibilityState = {
  pathname: "/",
  tutorOpen: false,
  examActive: false,
};

function api(): TawkApi | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Tawk_API;
}

/** Runs `fn` once the embed has fired onLoad (or immediately if already ready). */
export function whenTawkReady(fn: () => void): void {
  if (typeof window === "undefined") return;
  if (window.__tawkReady) {
    fn();
    return;
  }
  const onReady = () => {
    window.removeEventListener("tawk:load", onReady);
    fn();
  };
  window.addEventListener("tawk:load", onReady);
}

// Same clearance Ask Astra uses above the student tab bar.
const MOBILE_NAV_CLEARANCE = "calc(5.5rem + env(safe-area-inset-bottom, 0px))";

const TAWK_OFFSET_SELECTOR = [
  'iframe[title*="chat" i]',
  'iframe[src*="tawk"]',
  "#tawkchat-minimized",
  ".widget-visible",
].join(",");

function shouldLiftForMobileNav(): boolean {
  return (
    document.documentElement.getAttribute("data-mobile-nav") === "on" &&
    window.matchMedia("(max-width: 1023px)").matches
  );
}

function applyBottom(node: HTMLElement, lift: boolean): void {
  if (lift) node.style.setProperty("bottom", MOBILE_NAV_CLEARANCE, "important");
  else node.style.removeProperty("bottom");
}

/**
 * Push the minimized bubble above the mobile tab bar. Tawk only exposes
 * zIndex via its API, and it writes inline `bottom`, so we override here.
 */
export function syncTawkMobileOffset(): void {
  if (typeof document === "undefined") return;
  const lift = shouldLiftForMobileNav();

  for (const node of document.querySelectorAll<HTMLElement>(TAWK_OFFSET_SELECTOR)) {
    const style = getComputedStyle(node);
    if (style.position === "fixed" || style.position === "absolute") {
      applyBottom(node, lift);
      continue;
    }
    // Newer embeds wrap the iframe in a fixed container.
    const parent = node.parentElement;
    if (parent && getComputedStyle(parent).position === "fixed") {
      applyBottom(parent, lift);
    }
  }
}

if (typeof window !== "undefined") {
  const runOffset = () => syncTawkMobileOffset();
  window.addEventListener("tawk:load", runOffset);
  window.addEventListener("tawk:layout", runOffset);
  window.addEventListener("resize", runOffset);
  whenTawkReady(() => {
    runOffset();
    // Tawk sometimes appends the iframe after onLoad.
    const obs = new MutationObserver(runOffset);
    obs.observe(document.body, { childList: true });
    window.setTimeout(() => obs.disconnect(), 15_000);
  });
}

function visitorName(
  firstName?: string | null,
  lastName?: string | null,
): string | { first: string; last: string } | undefined {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first && last) return { first, last };
  if (first) return first;
  return undefined;
}

function studyAttributes(profile: TawkVisitorProfile): Record<string, string> {
  const attrs: Record<string, string> = { id: profile.userId };
  if (profile.classLevel) attrs["class-level"] = profile.classLevel;
  if (profile.track) attrs.track = profile.track;
  if (profile.state) attrs.state = profile.state;
  if (profile.tier) attrs.tier = profile.tier;
  return attrs;
}

/**
 * Secure login when a hash is present; otherwise only non-PII study attributes.
 * Name/email require the HMAC — never send them without it.
 */
export function loginTawkVisitor(profile: TawkVisitorProfile): void {
  whenTawkReady(() => {
    const tawk = api();
    if (!tawk) return;

    const attrs = studyAttributes(profile);

    if (profile.hash && tawk.login) {
      const name = visitorName(profile.firstName, profile.lastName);
      const email = profile.email?.trim();
      tawk.login(
        {
          hash: profile.hash,
          userId: profile.userId,
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
          ...attrs,
        },
        () => {},
      );
      return;
    }

    tawk.setAttributes?.(attrs, () => {});
  });
}

/** Clears the verified visitor so the next person does not inherit the chat. */
export function logoutTawkVisitor(): void {
  if (typeof window === "undefined") return;
  try {
    api()?.logout?.(() => {});
  } catch {
    // Sign-out must not fail because the chat SDK threw.
  }
}

function shouldHideWidget(state: VisibilityState): boolean {
  return (
    isAdminAnalyticsPath(state.pathname) || state.tutorOpen || state.examActive
  );
}

function applyVisibility(): void {
  whenTawkReady(() => {
    const tawk = api();
    if (!tawk) return;
    if (shouldHideWidget(visibility)) tawk.hideWidget?.();
    else {
      tawk.showWidget?.();
      syncTawkMobileOffset();
    }
  });
}

/** Merge route / tutor / exam flags and show or hide the bubble. */
export function syncTawkVisibility(
  partial: Partial<VisibilityState>,
): void {
  if (partial.pathname !== undefined) visibility.pathname = partial.pathname;
  if (partial.tutorOpen !== undefined) visibility.tutorOpen = partial.tutorOpen;
  if (partial.examActive !== undefined) visibility.examActive = partial.examActive;
  applyVisibility();
}
