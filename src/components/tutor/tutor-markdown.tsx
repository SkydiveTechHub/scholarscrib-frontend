"use client";

import { useEffect, useMemo, useState } from "react";
import { MarkdownBase, type RenderMath } from "@/components/lesson/markdown-base";
import { prepareTutorMarkdown } from "@/lib/tutor/format";
import { escapeHtml } from "./escape-html";

const plain: RenderMath = (tex) => escapeHtml(tex);

/**
 * Reply text, with KaTeX pulled in only when a reply actually contains maths.
 * Until it arrives, formulas show as escaped source, so a streaming reply is
 * readable at every moment and never injects markup.
 */
export function TutorMarkdown({
  content,
  streaming = false,
}: {
  content: string;
  /** Hold back half-written syntax so it doesn't flash as raw markdown. */
  streaming?: boolean;
}) {
  const [renderMath, setRenderMath] = useState<RenderMath>(() => plain);
  const text = useMemo(
    () => prepareTutorMarkdown(content, streaming),
    [content, streaming],
  );
  const hasMath = text.includes("$");

  useEffect(() => {
    if (!hasMath) return;
    let live = true;
    void import("@/lib/latex").then((m) => {
      if (live) setRenderMath(() => m.renderLatex);
    });
    return () => {
      live = false;
    };
  }, [hasMath]);

  return <MarkdownBase content={text} renderMath={renderMath} />;
}
