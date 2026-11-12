import {
  LuClipboardList,
  LuCreditCard,
  LuGraduationCap,
  LuSettings,
  LuSparkles,
  LuUsers,
  LuUserCog,
} from "react-icons/lu";
import type { IconType } from "react-icons";

export type CenterNavItem = {
  name: string;
  href: string;
  icon: IconType;
  /** Owner-only destinations (billing, wallet). Hidden for facilitators. */
  ownerOnly?: boolean;
};

export type CenterNavGroup = {
  label: string;
  items: readonly CenterNavItem[];
};

/**
 * Center console nav. Billing (plans, tokens, referral wallet) stay
 * owner-only (T-9). Astra is available to owners and facilitators (AI-1);
 * both draw from the center token pool.
 */
export const CENTER_NAV_GROUPS: readonly CenterNavGroup[] = [
  {
    label: "Center",
    items: [
      { name: "Roster", href: "/center/roster", icon: LuUsers },
      { name: "Assignments", href: "/center/assignments", icon: LuClipboardList },
      { name: "Students", href: "/center/students", icon: LuGraduationCap },
      { name: "Astra", href: "/center/astra", icon: LuSparkles },
      { name: "Team", href: "/center/team", icon: LuUserCog },
      {
        name: "Settings",
        href: "/center/settings",
        icon: LuSettings,
        ownerOnly: true,
      },
      {
        name: "Billing",
        href: "/center/billing",
        icon: LuCreditCard,
        ownerOnly: true,
      },
    ],
  },
];

/** Mobile bar destinations (Astra included; Billing/Settings filtered for facilitators). */
export const MOBILE_NAV_HREFS: readonly string[] = [
  "/center/roster",
  "/center/assignments",
  "/center/students",
  "/center/astra",
  "/center/billing",
];

export type CenterNavOptions = {
  /** When false, owner-only items (Billing, Settings) are omitted. Default true. */
  includeOwnerOnly?: boolean;
};

function filterItems(
  items: readonly CenterNavItem[],
  opts?: CenterNavOptions,
): CenterNavItem[] {
  const includeOwnerOnly = opts?.includeOwnerOnly !== false;
  return items.filter((item) => includeOwnerOnly || !item.ownerOnly);
}

export function centerNavGroups(
  opts?: CenterNavOptions,
): CenterNavGroup[] {
  return CENTER_NAV_GROUPS.map((group) => ({
    ...group,
    items: filterItems(group.items, opts),
  })).filter((group) => group.items.length > 0);
}

export function centerNavItems(opts?: CenterNavOptions): CenterNavItem[] {
  return centerNavGroups(opts).flatMap((group) => [...group.items]);
}

export function mobileBarItems(opts?: CenterNavOptions): CenterNavItem[] {
  const items = centerNavItems(opts);
  return MOBILE_NAV_HREFS.map((href) =>
    items.find((item) => item.href === href),
  ).filter((item): item is CenterNavItem => item !== undefined);
}
