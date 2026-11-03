"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LuCalendarClock,
  LuCalendarPlus,
  LuClipboardCheck,
  LuSparkles,
} from "react-icons/lu";
import { siteName } from "@/lib/seo/site";
import "./launch-gate.css";

// 9 November 2026, 00:00 in Lagos (WAT, UTC+1).
const LAUNCH_AT = new Date("2026-11-09T00:00:00+01:00").getTime();
const GATED_PATHS = ["/login", "/register"];

// Local and preview builds can set NEXT_PUBLIC_SKIP_LAUNCH_GATE=true to reach
// the real forms before launch day.
const SKIP = process.env.NEXT_PUBLIC_SKIP_LAUNCH_GATE === "true";

const CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  `&text=${encodeURIComponent("ScholarsCrib launch")}` +
  "&dates=20261109/20261110" +
  `&details=${encodeURIComponent(
    "ScholarsCrib opens for sign-ups today. Create your account and start practising.",
  )}`;

const UNLOCKS = [
  {
    icon: LuClipboardCheck,
    title: "Past questions with explanations",
    text: "Real WAEC, JAMB and NECO questions, sorted by subject and year.",
  },
  {
    icon: LuSparkles,
    title: "Timed mock exams",
    text: "Full-length practice under real exam conditions.",
  },
  {
    icon: LuCalendarClock,
    title: "A study plan that adapts",
    text: "It changes with your scores and how much time you have.",
  },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Tile({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-2xl bg-primary px-3 py-5 text-center text-primary-foreground shadow-soft sm:py-7"
          : "rounded-2xl border border-border bg-card px-3 py-5 text-center shadow-soft sm:py-7"
      }
    >
      {/* key restarts the tick animation each time the value changes. */}
      <span
        key={value}
        className="lg-tick block text-4xl font-black leading-none tabular-nums tracking-tight sm:text-5xl"
      >
        {value}
      </span>
      <span
        className={
          accent
            ? "mt-2 block text-xs font-bold text-primary-foreground/80 sm:text-sm"
            : "mt-2 block text-xs font-bold text-muted sm:text-sm"
        }
      >
        {label}
      </span>
    </div>
  );
}

function Countdown() {
  // null until mounted: the server and first client render must match, and
  // "now" never does.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = now === null ? null : Math.max(0, LAUNCH_AT - now);
  const dash = "––";
  const part = (ms: number | null, size: number, mod?: number) =>
    ms === null
      ? dash
      : pad(Math.floor(mod ? (ms % mod) / size : ms / size));

  const days = part(left, 86_400_000);
  const hours = part(left, 3_600_000, 86_400_000);
  const minutes = part(left, 60_000, 3_600_000);
  const seconds = part(left, 1000, 60_000);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Brand panel: a slim header on phones, a full column on desktop. */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-6 py-6 text-white lg:flex lg:w-1/2 lg:items-center lg:justify-center lg:p-12">
        <div className="pointer-events-none absolute -left-24 -top-24 hidden h-96 w-96 rounded-full bg-white/10 lg:block" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 hidden h-[28rem] w-[28rem] rounded-full bg-white/10 lg:block" />

        <div className="relative mx-auto flex max-w-md flex-col lg:mx-0">
          <Image
            src="/logo-on-dark.png"
            alt={siteName}
            width={236}
            height={64}
            priority
            className="h-10 w-auto self-start lg:h-14"
          />

          <div className="hidden lg:block">
            <h2 className="mt-12 text-3xl font-bold leading-tight">
              Your exam score is built question by question.
            </h2>
            <p className="mt-4 leading-relaxed text-hero-ink">
              Here is what opens for you on launch day.
            </p>

            <ul className="mt-8 space-y-5">
              {UNLOCKS.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-hero-ink/90">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Countdown */}
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:p-12">
        <div className="w-full max-w-lg">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1.5 text-sm font-bold text-primary-soft-foreground">
            <span className="lg-pulse h-2 w-2 rounded-full bg-primary" />
            Launching Monday, 9 November 2026
          </p>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Sign-ups open soon.
          </h1>
          <p className="mt-3 leading-relaxed text-muted">
            Accounts, lessons and mock exams all go live on launch day. Come
            back then to create your account and start practising.
          </p>

          <div
            role="timer"
            aria-label={
              left === null
                ? "Countdown to launch"
                : `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds until launch`
            }
            className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <Tile value={days} label="Days" />
            <Tile value={hours} label="Hours" />
            <Tile value={minutes} label="Minutes" />
            <Tile value={seconds} label="Seconds" accent />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover active:scale-[0.99]"
            >
              <LuCalendarPlus className="h-4 w-4" />
              Add to calendar
            </a>
            <Link
              href="/"
              className="flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground shadow-soft transition-all hover:border-primary/40 hover:bg-primary-soft active:scale-[0.99]"
            >
              Back to home
            </Link>
          </div>

          {/* The brand panel's list is hidden on phones, so repeat it here. */}
          <ul className="mt-10 space-y-4 border-t border-border pt-8 lg:hidden">
            {UNLOCKS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

export function LaunchGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [launched, setLaunched] = useState(() => Date.now() >= LAUNCH_AT);

  // Lift the gate on its own if the page is still open at launch time.
  useEffect(() => {
    if (launched) return;
    const id = window.setTimeout(
      () => setLaunched(Date.now() >= LAUNCH_AT),
      Math.min(Math.max(LAUNCH_AT - Date.now(), 0), 2_000_000_000),
    );
    return () => window.clearTimeout(id);
  }, [launched]);

  const gated = GATED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (SKIP || launched || !gated) return <>{children}</>;
  return <Countdown />;
}
