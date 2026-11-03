"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { siteName } from "@/lib/seo/site";
import "./launch-gate.css";

// 9 November 2026, 00:00 in Lagos (WAT, UTC+1).
const LAUNCH_AT = new Date("2026-11-09T00:00:00+01:00").getTime();
const GATED_PATHS = ["/login", "/register"];
// One bubble per day of the final fortnight.
const BUBBLES = 14;
const DAY = 86_400_000;

// Local and preview builds can set NEXT_PUBLIC_SKIP_LAUNCH_GATE=true to reach
// the real forms before launch day.
const SKIP = process.env.NEXT_PUBLIC_SKIP_LAUNCH_GATE === "true";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="lg-unit">
      <span className="lg-unit-value">{value}</span>
      <span className="lg-unit-label">{label}</span>
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
  const days = left === null ? null : Math.floor(left / DAY);
  const hours = left === null ? null : Math.floor((left % DAY) / 3_600_000);
  const minutes = left === null ? null : Math.floor((left % 3_600_000) / 60_000);
  const seconds = left === null ? null : Math.floor((left % 60_000) / 1000);

  const filled =
    days === null ? 0 : Math.min(BUBBLES, Math.max(0, BUBBLES - days));
  const dash = "––";

  return (
    <main className="lg-root">
      <div className="lg-grain" aria-hidden />

      <div className="lg-inner">
        <Image
          src="/logo-on-dark.png"
          alt={siteName}
          width={236}
          height={64}
          priority
          className="h-12 w-auto"
        />

        <div className="lg-stage">
          <p className="lg-kicker">Sign-ups open Monday, 9 November 2026</p>

          <h1 className="lg-days" aria-live="off">
            <span className="lg-days-number">
              {days === null ? dash : pad(days)}
            </span>
            <span className="lg-days-word">
              {days === 1 ? "day" : "days"} to go
            </span>
          </h1>

          {/* The answer sheet: one bubble shaded per day that has passed. */}
          <ol className="lg-sheet" aria-hidden>
            {Array.from({ length: BUBBLES }, (_, i) => (
              <li
                key={i}
                className="lg-bubble"
                data-filled={i < filled ? "true" : "false"}
                style={{ ["--i" as string]: i }}
              />
            ))}
          </ol>

          <div
            className="lg-clock"
            role="timer"
            aria-label={
              left === null
                ? "Countdown to launch"
                : `${days} days, ${hours} hours, ${minutes} minutes left until launch`
            }
          >
            <Unit value={hours === null ? dash : pad(hours)} label="hours" />
            <span className="lg-colon" aria-hidden>
              :
            </span>
            <Unit
              value={minutes === null ? dash : pad(minutes)}
              label="minutes"
            />
            <span className="lg-colon" aria-hidden>
              :
            </span>
            <Unit
              value={seconds === null ? dash : pad(seconds)}
              label="seconds"

            />
          </div>

          <p className="lg-copy">
            Accounts, lessons and mock exams unlock together on launch day.
            Come back then and sign in to start practising.
          </p>

          <div className="lg-actions">
            <Link href="/" className="lg-btn lg-btn-primary">
              Back to home
            </Link>
            <Link href="/contact" className="lg-btn lg-btn-ghost">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export function LaunchGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [launched, setLaunched] = useState(() => Date.now() >= LAUNCH_AT);

  // Lift the gate on its own if the page is still open at launch time.
  useEffect(() => {
    if (launched) return;
    const wait = LAUNCH_AT - Date.now();
    if (wait <= 0) {
      setLaunched(true);
      return;
    }
    // setTimeout caps at ~24.8 days; re-check on a coarser tick beyond that.
    const id = window.setTimeout(
      () => setLaunched(Date.now() >= LAUNCH_AT),
      Math.min(wait, 2_000_000_000),
    );
    return () => window.clearTimeout(id);
  }, [launched]);

  const gated = GATED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (SKIP || launched || !gated) return <>{children}</>;
  return <Countdown />;
}
