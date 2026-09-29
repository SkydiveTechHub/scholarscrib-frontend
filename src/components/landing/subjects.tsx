import Link from "next/link";
import {
  LuArrowRight,
  LuAtom,
  LuBriefcase,
  LuFeather,
  LuHammer,
  LuPenTool,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { TRACK_LABELS, type TrackCategory } from "@/lib/subjects";
import { SectionHeader } from "./section";
import { Reveal } from "./reveal";

/**
 * Example subjects per track, not a catalogue. Deliberately carries no lesson
 * or question counts: coverage is still being filled subject by subject
 * (PRD §9.4), and the landing page must not claim more than exists.
 */
const TRACKS: {
  track: TrackCategory;
  icon: typeof LuAtom;
  gradient: string;
  blurb: string;
  examples: string[];
}[] = [
  {
    track: "CORE",
    icon: LuPenTool,
    gradient: "from-blue-500 to-indigo-600",
    blurb: "Compulsory for every student, whatever your track.",
    examples: ["English Language", "Mathematics", "Civic Education"],
  },
  {
    track: "SCIENCE",
    icon: LuAtom,
    gradient: "from-green-500 to-emerald-600",
    blurb: "For medicine, engineering and the sciences.",
    examples: ["Biology", "Chemistry", "Physics", "Further Mathematics"],
  },
  {
    track: "ARTS",
    icon: LuFeather,
    gradient: "from-violet-500 to-purple-600",
    blurb: "For law, the humanities and the arts.",
    examples: ["Literature in English", "Government", "CRS / IRS"],
  },
  {
    track: "COMMERCIAL",
    icon: LuBriefcase,
    gradient: "from-amber-500 to-orange-600",
    blurb: "For accounting, business and economics.",
    examples: ["Economics", "Commerce", "Financial Accounting"],
  },
  {
    track: "VOCATIONAL",
    icon: LuHammer,
    gradient: "from-teal-500 to-cyan-600",
    blurb: "Trade and practical subjects on the curriculum.",
    examples: ["Agricultural Science", "Computer Studies", "Technical Drawing"],
  },
];

export function Subjects() {
  return (
    <section id="subjects" className="scroll-mt-20 bg-gradient-to-b from-secondary/40 to-transparent">
      <div className="landing-container py-20 lg:py-28">
        <SectionHeader
          eyebrow="The curriculum"
          title={
            <>
              Your subjects, organised{" "}
              <span className="gradient-text animate-gradient-pan">
                by class and term
              </span>
            </>
          }
          description="Subjects follow the government-approved senior-secondary curriculum and your Science, Arts or Commercial track. Every topic carries its WAEC and JAMB weighting, so you know where the marks are."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TRACKS.map((t, i) => (
            <Reveal key={t.track} delay={i * 80}>
              <div className="group relative h-full overflow-hidden rounded-2xl surface hairline p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-60 transition-opacity duration-300 group-hover:opacity-100",
                    t.gradient,
                  )}
                  aria-hidden
                />
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-soft transition-transform duration-300 group-hover:scale-105",
                    t.gradient,
                  )}
                >
                  <t.icon className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-base font-extrabold tracking-tight ink">
                  {TRACK_LABELS[t.track]}
                </h3>
                <p className="mt-1 text-xs font-semibold ink-faint">{t.blurb}</p>

                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {t.examples.map((subject) => (
                    <li key={subject} className="chip surface-2 text-ink-muted">
                      {subject}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <p className="max-w-xl text-sm font-semibold ink-muted">
              Notes and past questions are being added subject by subject. Browse
              what’s live today — no account needed.
            </p>
            <Link
              href="/learn"
              className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary transition-colors hover:text-primary-hover"
            >
              Browse subjects
              <LuArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
