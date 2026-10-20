"use client";

import { useEffect, useState } from "react";
import { MarkdownBase, type RenderMath } from "@/components/lesson/markdown-base";
import { escapeHtml } from "./escape-html";

const plain: RenderMath = (tex) => escapeHtml(tex);

/**
 * Reply text, with KaTeX pulled in only when a reply actually contains maths.
 * Until it arrives, formulas show as escaped source, so a streaming reply is
 * readable at every moment and never injects markup.
 */
export function TutorMarkdown({ content }: { content: string }) {
  const [renderMath, setRenderMath] = useState<RenderMath>(() => plain);
  const hasMath = content.includes("$");

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

  return <MarkdownBase content={content} renderMath={renderMath} />;
}
