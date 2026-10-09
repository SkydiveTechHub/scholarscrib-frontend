import {
  LuAtom,
  LuBookMarked,
  LuCalculator,
  LuCpu,
  LuDna,
  LuFeather,
  LuFlaskConical,
  LuLandmark,
  LuPenTool,
  LuSigma,
  LuSprout,
  LuStore,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section";
import { Reveal } from "./reveal";

const SUBJECTS = [
  {
    name: "Mathematics",
    icon: LuCalculator,
    gradient: "from-blue-500 to-indigo-600",
    tagline: "Algebra, geometry, statistics & more",
  },
  {
    name: "English Language",
    icon: LuPenTool,
    gradient: "from-emerald-500 to-teal-600",
    tagline: "Comprehension, grammar & lexis",
  },
  {
    name: "Biology",
    icon: LuDna,
    gradient: "from-green-500 to-emerald-600",
    tagline: "Cells, genetics & ecology",
  },
  {
    name: "Chemistry",
    icon: LuFlaskConical,
    gradient: "from-violet-500 to-purple-600",
    tagline: "Moles, bonding & reactions",
  },
  {
    name: "Physics",
    icon: LuAtom,
    gradient: "from-cyan-500 to-blue-600",
    tagline: "Mechanics, waves & energy",
  },
  {
    name: "Economics",
    icon: LuStore,
    gradient: "from-amber-500 to-orange-600",
    tagline: "Markets, money & national income",
  },
  {
    name: "Government",
    icon: LuLandmark,
    gradient: "from-rose-500 to-pink-600",
    tagline: "Policies, constitutions & systems",
  },
  {
    name: "Commerce",
    icon: LuBookMarked,
    gradient: "from-fuchsia-500 to-purple-600",
    tagline: "Trade, finance & business",
  },
  {
    name: "Literature in English",
    icon: LuFeather,
    gradient: "from-teal-500 to-cyan-600",
    tagline: "Prose, poetry & drama",
  },
  {
    name: "Agricultural Science",
    icon: LuSprout,
    gradient: "from-lime-500 to-green-600",
    tagline: "Crops, animals & soil",
  },
  {
    name: "Further Mathematics",
    icon: LuSigma,
    gradient: "from-indigo-500 to-blue-700",
    tagline: "Calculus, vectors & logic",
  },
  {
    name: "Computer Studies",
    icon: LuCpu,
    gradient: "from-slate-600 to-slate-800",
    tagline: "Hardware, software & programming",
  },
];

export function Subjects() {
  return (
    <section id="subjects" className="scroll-mt-20 bg-gradient-to-b from-secondary/40 to-transparent">
      <div className="landing-container py-20 lg:py-28">
        <SectionHeader
          eyebrow="Subjects"
          title={
            <>
              Every subject your{" "}
              <span className="gradient-text animate-gradient-pan">
                exam needs
              </span>
            </>
          }
          description="From Mathematics to Computer Studies — lessons, flashcards and practice questions organised around the Nigerian curriculum."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SUBJECTS.map((subject, i) => (
            <Reveal key={subject.name} delay={(i % 4) * 80}>
              <div className="group relative h-full overflow-hidden rounded-2xl surface hairline p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-60 transition-opacity duration-300 group-hover:opacity-100",
                    subject.gradient,
                  )}
                  aria-hidden
                />
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-soft transition-transform duration-300 group-hover:scale-105",
                      subject.gradient,
                    )}
                  >
                    <subject.icon className="h-6 w-6" />
                  </div>
                </div>

                <h3 className="mt-4 text-base font-extrabold tracking-tight ink">
                  {subject.name}
                </h3>
                <p className="mt-1 text-xs font-semibold ink-faint">
                  {subject.tagline}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
