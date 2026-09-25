/**
 * Renderability rule for public pages: `options` is a JSON column on the
 * backend; a row with no parsed options cannot be rendered as a sample, so it
 * must not count toward a page's question count either. This is the one place
 * that rule lives — learn-data.ts's loadPublicTopic and paper-data.ts's
 * loadPaper/loadEligiblePaperParams both call it, so the prerendered/sitemapped
 * set and the non-404 set can never drift apart.
 */
export function keepRenderable<T extends { options: unknown }>(
  questions: T[],
): (T & { options: Record<string, string> })[] {
  return questions.flatMap((q) => {
    const options = q.options as Record<string, string> | null;
    if (!options || Object.keys(options).length === 0) return [];
    return [{ ...q, options }];
  });
}