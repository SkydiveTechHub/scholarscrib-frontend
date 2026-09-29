import { LuBot, LuSchool, LuStore, LuVideo } from "react-icons/lu";
import { SectionHeader } from "./section";
import { Reveal } from "./reveal";

/**
 * The platform vision from PRD §1. None of this is built; every card is
 * labelled as upcoming so the page never sells something that cannot be used.
 * Move an item into the feature sections only once it ships.
 */
const UPCOMING = [
  {
    icon: LuVideo,
    title: "Video lessons",
    text: "Each topic page showing its notes and video lessons side by side.",
  },
  {
    icon: LuBot,
    title: "AI study assistant",
    text: "Ask questions while you learn and get concepts explained at your level.",
  },
  {
    icon: LuSchool,
    title: "Teacher & school portals",
    text: "Teachers create lesson notes and tests; schools run term exams on CBT.",
  },
  {
    icon: LuStore,
    title: "Marketplace",
    text: "Teacher-recorded lessons, exam pins and scholarship applications.",
  },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="scroll-mt-20 bg-gradient-to-b from-transparent to-secondary/40">
      <div className="landing-container py-20 lg:py-28">
        <SectionHeader
          eyebrow="What’s next"
          title={
            <>
              Bringing the whole school{" "}
              <span className="gradient-text animate-gradient-pan">
                to your device
              </span>
            </>
          }
          description="The student app is where we start. Here’s what we’re building next — none of it is available yet, and we’ll say so plainly until it is."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {UPCOMING.map((item, i) => (
            <Reveal key={item.title} delay={i * 80}>
              <div className="relative h-full rounded-2xl border border-dashed border-primary/25 surface p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full surface-2 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ink-faint">
                    Coming soon
                  </span>
                </div>
                <h3 className="mt-4 text-base font-extrabold tracking-tight ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed ink-muted">
                  {item.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
