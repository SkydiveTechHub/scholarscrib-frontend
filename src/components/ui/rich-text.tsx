import { Fragment, type ReactNode } from "react";
import { parseQuestionMarkup, type MarkupNode } from "@/lib/question-markup";

/**
 * Question-bank text — a question, an option, an explanation — with its
 * powers, number bases and line breaks typeset rather than shown as source.
 *
 * Renders React elements from an allowlisted tree (see `question-markup.ts`),
 * never the provider's HTML, so it is safe on any text the bank returns. No
 * hooks and no client code: it renders the same in server and client trees.
 */
export function RichText({ text }: { text: string | null | undefined }) {
  return <>{renderNodes(parseQuestionMarkup(text))}</>;
}

// Shrunk and nudged rather than left to the browser default, which pushes the
// line apart in a list of options and sits too low under a base like "(212)".
const SCRIPT_CLS = "relative text-[0.72em] leading-none";

function renderNodes(nodes: MarkupNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <Fragment key={i}>{node.text}</Fragment>;
      case "br":
        return <br key={i} />;
      case "sup":
        return (
          <sup key={i} className={`${SCRIPT_CLS} -top-[0.5em] align-baseline`}>
            {renderNodes(node.children)}
          </sup>
        );
      case "sub":
        return (
          <sub key={i} className={`${SCRIPT_CLS} -bottom-[0.25em] align-baseline`}>
            {renderNodes(node.children)}
          </sub>
        );
      case "b":
        return <strong key={i}>{renderNodes(node.children)}</strong>;
      case "i":
        return <em key={i}>{renderNodes(node.children)}</em>;
      case "u":
        return <u key={i}>{renderNodes(node.children)}</u>;
    }
  });
}
