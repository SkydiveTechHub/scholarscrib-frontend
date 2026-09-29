import {
  LuBookOpen,
  LuBrainCircuit,
  LuChartLine,
  LuClipboardList,
  LuHistory,
  LuLayers,
  LuTarget,
  LuTrophy,
} from "react-icons/lu";
import { SectionHeader } from "./section";
import { Reveal } from "./reveal";

const FEATURES = [
  {
    icon: LuBookOpen,
    title: "Term-by-Term Lessons",
    text: "Your class curriculum organised by SS1–SS3 and by term. Pick a subject, pick a topic, and the notes are there.",
  },
  {
    icon: LuClipboardList,
    title: "Real Past Questions",
    text: "WAEC, JAMB and NECO past questions filed by year and topic, each with a full explanation.",
  },
  {
    icon: LuLayers,
    title: "Full CBT Simulation",
    text: "180 questions, 4 subjects, 120 minutes — the JAMB UTME format, subject tabs and all.",
  },
  {
    icon: LuHistory,
    title: "Retention Tracking",
    text: "Mastery fades when a topic goes unpractised, so you see what you still remember — not just what you once scored.",
  },
  {
    icon: LuBrainCircuit,
    title: "Smart Flashcards",
    text: "Build decks from any lesson. Spaced repetition brings each card back just before you’d forget it.",
  },
  {
    icon: LuChartLine,
    title: "Honest Analytics",
    text: "Weak → Developing → Competent → Strong for every topic, plus a predicted grade once there’s enough evidence.",
  },
  {
    icon: LuTarget,
    title: "Personal Study Plan",
    text: "Tell us your subjects and daily hours; we map each week to lessons, practice, revision and mock exams.",
  },
  {
    icon: LuTrophy,
    title: "Streaks & Badges",
    text: "Achievements for streaks, perfect scores and mastered subjects keep even five focused minutes a day going.",
  },
];

export function WhyUs() {
  return (
    <section id="features" className="scroll-mt-20">
      <div className="landing-container py-20 lg:py-28">
        <SectionHeader
          eyebrow="Why ScholarsCrib"
          title={
            <>
              Everything you need to learn,{" "}
              <span className="gradient-text animate-gradient-pan">
                in one place
              </span>
            </>
          }
          description="No more jumping between a notes website, a past-question app and a stack of textbooks. Lessons, practice, revision and progress live together — and talk to each other."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 4) * 80}>
              <div className="group relative h-full overflow-hidden rounded-2xl surface hairline p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-primary/10 to-brand/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden
                />
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-blue-600 to-brand text-white shadow-soft transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-extrabold tracking-tight ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed ink-muted">
                  {feature.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
