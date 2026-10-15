import { toNotes, type NotesBlock } from "@/lib/classroom";
import type { ExampleBlock, LessonBlock } from "@/lib/lesson-engine";
import { InlineMarkdown, Markdown } from "@/components/lesson/markdown";
import { InteractiveDiagram } from "@/components/lesson/interactive-diagram";

// The one place a lesson's blocks are rendered as reading material. The topic
// page uses it for locked previews and for lessons without blocks; `LessonScroll`
// uses it for the tracked lesson, adding inline checks around it. Everything is
// shown plainly: the reveal / flip / step-by-step behaviour is recall practice,
// and that belongs to flashcards, not to the lesson.

export function LessonNotes({
  blocks,
  fallbackContent,
}: {
  blocks: LessonBlock[];
  fallbackContent: string | null;
}) {
  const notes = toNotes(blocks);

  // All 150 authored lessons have blocks; this path is defensive.
  if (notes.length === 0) {
    return fallbackContent ? <Markdown content={fallbackContent} /> : null;
  }

  return (
    <article className="space-y-6">
      {notes.map((block) => (
        <NoteBlockView key={block.id} block={block} />
      ))}
    </article>
  );
}

export function NoteBlockView({ block }: { block: NotesBlock }) {
  switch (block.type) {
    case "concept":
      return (
        <section>
          {block.title && (
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {block.title}
            </h2>
          )}
          <div className="mt-2 leading-relaxed text-foreground">
            <Markdown content={block.text} />
          </div>
          {block.reveal && (
            <div className="mt-3 rounded-xl bg-primary-soft/60 px-3.5 py-3 text-sm leading-relaxed text-foreground">
              <Markdown content={block.reveal} />
            </div>
          )}
        </section>
      );

    case "example":
      return <PlainExample block={block} />;

    case "diagram":
      return <InteractiveDiagram block={block} />;

    case "tip":
      return (
        <aside className="rounded-xl bg-tone-blue-soft p-4 text-sm text-tone-blue-ink">
          <Markdown content={block.text} />
        </aside>
      );

    case "mistake":
      return (
        <aside className="rounded-xl bg-tone-red-soft p-4 text-sm text-tone-red-ink">
          <p className="line-through opacity-70">
            <InlineMarkdown content={block.wrong} />
          </p>
          <p className="mt-1 font-semibold">
            <InlineMarkdown content={block.right} />
          </p>
        </aside>
      );

    case "mnemonic":
      return (
        <aside className="rounded-xl bg-tone-purple-soft p-4 text-sm text-tone-purple-ink">
          <p className="font-bold">
            <InlineMarkdown content={block.phrase} />
          </p>
          <ul className="mt-2 space-y-0.5">
            {block.encoded.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </aside>
      );

    default:
      return null;
  }
}

function PlainExample({ block }: { block: ExampleBlock }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-primary-soft px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-primary-soft-foreground">
          Worked example
        </p>
        {block.title && (
          <p className="text-sm font-semibold text-foreground">{block.title}</p>
        )}
      </div>
      <div className="p-4">
        <Markdown content={block.problem} />
        {block.steps.length > 0 && (
          <ol className="mt-4 space-y-2">
            {block.steps.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/40 px-3 py-2.5"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Markdown content={step} />
                </div>
              </li>
            ))}
          </ol>
        )}
        {block.answer && (
          <div className="mt-3 rounded-xl bg-success-soft/70 px-3 py-2.5">
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-semibold text-success">Answer: </span>
              <InlineMarkdown content={block.answer} />
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
