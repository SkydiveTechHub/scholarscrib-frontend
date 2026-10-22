import type { TutorToolCall, TutorUiBlock } from "./types";

const MAX_STEPS = 8;
const MAX_CHOICES = 4;

export function parseTool(raw: unknown): TutorToolCall | null {
  if (!raw || typeof raw !== "object") return null;
  const tool = raw as Record<string, unknown>;
  if (typeof tool.id !== "string" || tool.id === "") return null;
  if (typeof tool.name !== "string" || tool.name === "") return null;
  if (
    tool.phase !== "running" &&
    tool.phase !== "done" &&
    tool.phase !== "failed"
  ) {
    return null;
  }
  if (typeof tool.summary !== "string") return null;
  return {
    id: tool.id,
    name: tool.name,
    phase: tool.phase,
    summary: tool.summary,
  };
}

function shortStrings(raw: unknown, max: number): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > max) return null;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || item.trim() === "") return null;
    out.push(item);
  }
  return out;
}

/** Allowlisted study cards. Unknown components and broken props are dropped. */
export function parseUiBlock(raw: unknown): TutorUiBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const block = raw as Record<string, unknown>;
  if (typeof block.id !== "string" || block.id === "") return null;
  if (!block.props || typeof block.props !== "object") return null;
  const props = block.props as Record<string, unknown>;

  if (block.component === "worked_example") {
    if (typeof props.problem !== "string" || props.problem.trim() === "") {
      return null;
    }
    const steps = shortStrings(props.steps, MAX_STEPS);
    if (!steps) return null;
    return {
      id: block.id,
      component: "worked_example",
      props: { problem: props.problem, steps },
    };
  }

  if (block.component === "practice_question") {
    if (typeof props.prompt !== "string" || props.prompt.trim() === "") {
      return null;
    }
    if (props.choices == null) {
      return {
        id: block.id,
        component: "practice_question",
        props: { prompt: props.prompt },
      };
    }
    const choices = shortStrings(props.choices, MAX_CHOICES);
    if (!choices) return null;
    return {
      id: block.id,
      component: "practice_question",
      props: { prompt: props.prompt, choices },
    };
  }

  return null;
}

export function parseToolList(raw: unknown): TutorToolCall[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tools = raw
    .map(parseTool)
    .filter((tool): tool is TutorToolCall => tool != null);
  return tools.length > 0 ? tools : undefined;
}

export function parseBlockList(raw: unknown): TutorUiBlock[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const blocks = raw
    .map(parseUiBlock)
    .filter((block): block is TutorUiBlock => block != null);
  return blocks.length > 0 ? blocks : undefined;
}
