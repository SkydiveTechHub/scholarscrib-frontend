// Question, option and explanation text arrives from the bank with a little
// inline HTML in it — mostly <sup>/<sub> for powers and number bases, as in
// "(212)<sub>3</sub>" — plus leftovers from Word's equation editor ("〖81〗",
// "2^3") and line breaks dropped mid-sentence. Rendered as plain text, all of
// it reached students as raw source.
//
// This module turns that text into a small tree of known nodes. It is pure and
// knows nothing of React, so the rules are unit-tested; `<RichText>` renders
// the tree as elements. Provider HTML is never injected: a tag outside the
// allowlist is dropped and its text kept, so nothing the bank sends can add
// markup, attributes or scripts to the page.

export type MarkupNode =
  | { type: "text"; text: string }
  | { type: "br" }
  | { type: "sup" | "sub" | "b" | "i" | "u"; children: MarkupNode[] };

type ElementType = "sup" | "sub" | "b" | "i" | "u";

/** Tags that become nodes, by the name the provider spells them with. */
const ELEMENT_TAGS: Record<string, ElementType> = {
  sup: "sup",
  sub: "sub",
  b: "b",
  strong: "b",
  i: "i",
  em: "i",
  u: "u",
};

/** Tags that only ever mean "new line here". */
const BREAK_TAGS = new Set(["br", "p", "div", "li"]);

/** Wrappers whose content is kept and whose tag is dropped. */
const TRANSPARENT_TAGS = new Set(["span", "font", "small", "big", "ul", "ol"]);

const KNOWN_TAGS = new Set([
  ...Object.keys(ELEMENT_TAGS),
  ...BREAK_TAGS,
  ...TRANSPARENT_TAGS,
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  minus: "−",
  times: "×",
  divide: "÷",
  plusmn: "±",
  deg: "°",
  le: "≤",
  ge: "≥",
  ne: "≠",
  asymp: "≈",
  radic: "√",
  pi: "π",
  theta: "θ",
  alpha: "α",
  beta: "β",
  sup2: "²",
  sup3: "³",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/**
 * A tag the provider could have sent. Attributes are accepted only when they
 * look like attributes (`name=`), so maths such as "a<b and c>d" stays text
 * instead of being read as a <b> tag.
 */
const TAG = /<(\/?)([a-z][a-z0-9]*)((?:\s+[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))*)\s*(\/?)>/gi;

/** Word's linear-format grouping brackets: they group, they are never shown. */
const WORD_BRACKETS = /[〖〗]/g;

/**
 * `x^2`, `2^(1/3)`, `e^{-x}`, `10^-3`: caret powers, as typed into a text box
 * or left behind by Word. The exponent is a signed number, one letter, or a
 * bracketed group with its outer brackets dropped. A lone caret is left alone.
 */
const CARET = /\^(\([^()]*\)|\{[^{}]*\}|[-−+]?\d+(?:\.\d+)?|[-−]?[a-zA-Z](?![a-zA-Z]))/g;

function tidyText(text: string): string {
  return decodeEntities(text).replace(WORD_BRACKETS, "").replace(/\s+/g, " ");
}

function caretPowers(text: string): MarkupNode[] {
  const nodes: MarkupNode[] = [];
  let last = 0;
  for (const match of text.matchAll(CARET)) {
    const at = match.index ?? 0;
    // Needs something to raise: "^2" at the start, or after a space, is not a power.
    if (at === 0 || /\s/.test(text[at - 1])) continue;
    if (at > last) nodes.push({ type: "text", text: text.slice(last, at) });
    let exponent = match[1];
    if (/^[({].*[)}]$/.test(exponent)) exponent = exponent.slice(1, -1);
    nodes.push({ type: "sup", children: [{ type: "text", text: exponent }] });
    last = at + match[0].length;
  }
  if (last === 0) return [{ type: "text", text }];
  if (last < text.length) nodes.push({ type: "text", text: text.slice(last) });
  return nodes;
}

/** Joins adjacent text, drops empty text, and trims the edges of a line. */
function compact(nodes: MarkupNode[]): MarkupNode[] {
  const out: MarkupNode[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      if (!node.text) continue;
      const prev = out[out.length - 1];
      if (prev?.type === "text") prev.text += node.text;
      else out.push({ ...node });
    } else if (node.type === "br") {
      // Never two breaks in a row, and never one before any content.
      if (out.length > 0 && out[out.length - 1].type !== "br") out.push(node);
    } else {
      const children = compact(node.children);
      if (children.length > 0) out.push({ type: node.type, children });
    }
  }
  while (out.length > 0 && out[out.length - 1].type === "br") out.pop();

  // A break replaces the space either side of it.
  out.forEach((node, i) => {
    if (node.type !== "text") return;
    if (i === 0 || out[i - 1].type === "br") node.text = node.text.trimStart();
    if (i === out.length - 1 || out[i + 1].type === "br") node.text = node.text.trimEnd();
  });
  return out.filter((node) => node.type !== "text" || node.text !== "");
}

export function parseQuestionMarkup(raw: string | null | undefined): MarkupNode[] {
  if (!raw) return [];
  const root: MarkupNode[] = [];
  const stack: { type: ElementType; children: MarkupNode[] }[] = [];
  const current = () => (stack.length > 0 ? stack[stack.length - 1].children : root);
  const inSup = () => stack.some((frame) => frame.type === "sup" || frame.type === "sub");

  const pushText = (text: string) => {
    const tidy = tidyText(text);
    if (!tidy) return;
    current().push(...(inSup() ? [{ type: "text" as const, text: tidy }] : caretPowers(tidy)));
  };

  let last = 0;
  for (const match of raw.matchAll(TAG)) {
    const [whole, closing, rawName, , selfClosing] = match;
    const name = rawName.toLowerCase();
    if (!KNOWN_TAGS.has(name)) continue; // not a tag we know: leave it as text
    const at = match.index ?? 0;
    pushText(raw.slice(last, at));
    last = at + whole.length;

    if (BREAK_TAGS.has(name)) {
      current().push({ type: "br" });
      continue;
    }
    const type = ELEMENT_TAGS[name];
    if (!type || selfClosing) continue; // a transparent wrapper, or <sup/>

    if (!closing) {
      const frame = { type, children: [] as MarkupNode[] };
      current().push(frame);
      stack.push(frame);
      continue;
    }
    // Close the nearest open element of this type; a stray close is dropped.
    const index = stack.map((frame) => frame.type).lastIndexOf(type);
    if (index !== -1) stack.length = index;
  }
  pushText(raw.slice(last));

  const nodes = compact(root);
  // Edges of the whole text: provider strings often end in a stray space.
  const first = nodes[0];
  if (first?.type === "text") first.text = first.text.trimStart();
  const end = nodes[nodes.length - 1];
  if (end?.type === "text") end.text = end.text.trimEnd();
  return nodes.filter((node) => node.type !== "text" || node.text !== "");
}

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "−": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ", x: "ˣ", y: "ʸ",
};

const SUBSCRIPT: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "−": "₋", "=": "₌", "(": "₍", ")": "₎", a: "ₐ", e: "ₑ", x: "ₓ", m: "ₘ", n: "ₙ",
};

function scripted(text: string, table: Record<string, string>, marker: "^" | "_"): string {
  const chars = [...text];
  if (chars.every((ch) => table[ch])) return chars.map((ch) => table[ch]).join("");
  return chars.length === 1 ? `${marker}${text}` : `${marker}(${text})`;
}

function plain(nodes: MarkupNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return node.text;
      if (node.type === "br") return " ";
      const inner = plain(node.children);
      if (node.type === "sup") return scripted(inner, SUPERSCRIPT, "^");
      if (node.type === "sub") return scripted(inner, SUBSCRIPT, "_");
      return inner;
    })
    .join("");
}

/**
 * The same text as one plain string, for places that cannot hold elements:
 * page titles, meta descriptions, aria labels and one-line previews. Powers
 * and bases use Unicode super/subscripts where every character has one
 * ("x²", "(212)₃"), and fall back to "^(…)" / "_(…)" where not.
 */
export function questionPlainText(raw: string | null | undefined): string {
  return plain(parseQuestionMarkup(raw)).replace(/\s+/g, " ").trim();
}
