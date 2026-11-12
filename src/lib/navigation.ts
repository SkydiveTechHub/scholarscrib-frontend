import {
  LuHouse,
  LuBookOpen,
  LuClipboardList,
  LuClipboardCheck,
  LuCalendar,
  LuChartBar,
  LuAward,
  LuSettings,
  LuSparkles,
  LuLightbulb,
} from "react-icons/lu";

export const NAV_GROUPS = [
  {
    label: "Study",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LuHouse },
      { name: "Classroom", href: "/classroom", icon: LuBookOpen },
      { name: "Flashcards", href: "/flashcards", icon: LuSparkles },
      // { name: "Library", href: "/library", icon: LuBook },
    ],
  },
  {
    label: "Practice",
    items: [
      { name: "Practice", href: "/practice", icon: LuClipboardCheck },
      { name: "Assigned", href: "/assigned", icon: LuClipboardList },
      { name: "Recommendations", href: "/recommendations", icon: LuLightbulb },
      { name: "Study Plan", href: "/study-plan", icon: LuCalendar },
    ],
  },
  {
    label: "Insights",
    items: [
      { name: "Performance", href: "/performance", icon: LuChartBar },
      { name: "Achievements", href: "/achievements", icon: LuAward },
    ],
  },
] as const;

export const SETTINGS_ITEM = {
  name: "Settings",
  href: "/settings",
  icon: LuSettings,
} as const;

