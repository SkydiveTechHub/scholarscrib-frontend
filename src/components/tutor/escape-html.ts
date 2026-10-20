// `MarkdownBase` injects whatever `renderMath` returns as HTML. Until KaTeX has
// loaded, the fallback returns the formula's source, so it must be escaped.
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
