"use client";

import { useEffect, useState } from "react";

type Render = (tex: string, displayMode: boolean) => string;

/**
 * One formula, typeset by KaTeX. KaTeX (~260KB) is fetched on first use, so
 * pages whose questions have no maths never download it. Until it arrives the
 * formula shows as plain source text -- React escapes it, so nothing is
 * injected -- and it is replaced in place once loaded.
 */
export function LazyMath({ tex }: { tex: string }) {
  const [render, setRender] = useState<Render | null>(null);

  useEffect(() => {
    let live = true;
    void import("@/lib/latex").then((m) => {
      if (live) setRender(() => m.renderLatex);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!render) return <span>{tex}</span>;
  return (
    <span
      className="inline-block max-w-full overflow-x-auto align-middle"
      dangerouslySetInnerHTML={{ __html: render(tex, false) }}
    />
  );
}
