// Prepares Astra's reply text for the shared markdown renderer. Pure and
// React-free so it runs under node:test.

/**
 * Models write maths as `\(…\)` / `\[…\]` as often as `$…$` / `$$…$$`; the
 * renderer only understands dollars, so convert before it sees them.
 */
function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, tex: string) => `$$${tex.trim()}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, tex: string) => `$${tex.trim()}$`);
}

/** `done.### Key points` → heading on its own block; headings need a line start. */
function splitGluedHeadings(text: string): string {
  return text.replace(/([^\n#\s])[ \t]*(#{2,6}[ \t]+\S)/g, "$1\n\n$2");
}

/**
 * While a reply streams, its last line is often half a construct: `| Rad`,
 * a bare `###`, `**bol`, `$\frac{1`. Rendered as-is they flash as raw
 * markdown before snapping into shape. Hold back only that unfinished tail
 * (never finished lines) until it completes.
 */
export function holdBackPartial(text: string): string {
  const cut = text.lastIndexOf("\n") + 1;
  let head = text.slice(0, cut);
  let tail = text.slice(cut);
  const probe = tail.trimStart();

  // Table row in progress, or a block marker with nothing after it yet.
  if (/^(\||#{1,6}\s*$|[-*+]\s*$|\d+[.)]?\s*$|>\s*$|`{1,3}\s*$)/.test(probe)) {
    return head;
  }

  // An open maths span: hide it until it closes so a formula appears whole
  // rather than as TeX source. Only a short tail, so a stray currency `$`
  // can't swallow the rest of a long line.
  const dollars = [...tail.matchAll(/(?<!\\)\$/g)];
  if (dollars.length % 2 === 1) {
    const at = dollars[dollars.length - 1].index!;
    if (tail.length - at <= 80) tail = tail.slice(0, at);
  }

  // A dangling `**` would print as asterisks until its partner arrives.
  const bold = [...tail.matchAll(/\*\*/g)];
  if (bold.length % 2 === 1) {
    const at = bold[bold.length - 1].index!;
    tail = tail.slice(0, at) + tail.slice(at + 2);
  }

  head += tail;
  return head;
}

export function prepareTutorMarkdown(text: string, streaming: boolean): string {
  const prepared = splitGluedHeadings(normalizeMathDelimiters(text));
  return streaming ? holdBackPartial(prepared) : prepared;
}
