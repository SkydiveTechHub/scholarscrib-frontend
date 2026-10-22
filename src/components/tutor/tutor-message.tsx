"use client";

import { useState } from "react";
import {
  LuCheck,
  LuCircleX,
  LuLoader,
  LuPencil,
  LuThumbsDown,
  LuThumbsUp,
} from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  actionConfirmLabel,
  actionIsDanger,
  actionTitle,
  canEditProposal,
  fieldValues,
  proposalEdits,
  toolCardTitle,
} from "@/lib/tutor/actions";
import type {
  ActionProposal,
  GroundedOn,
  TutorAction,
  TutorMessage,
  TutorToolCall,
  TutorUiBlock,
} from "@/lib/tutor/types";
import { useTutorStore } from "@/stores/tutor-store";
import { AstraAvatar } from "./astra-avatar";
import { TutorMarkdown } from "./tutor-markdown";

const SUGGESTION_LABELS: Record<TutorAction, string> = {
  explain_simply: "Explain simply",
  example: "Give an example",
  test_me: "Test me",
  hint_next: "Another hint",
  reveal: "Walk me through it",
  explain_differently: "Explain differently",
};

/** Three bouncing dots, like a chat app's "typing…". */
function TypingDots() {
  return (
    <span
      className="flex h-5 items-center gap-1"
      role="status"
      aria-label="Astra is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-muted motion-safe:animate-bounce motion-reduce:opacity-60"
          style={{ animationDelay: `${i * 160}ms`, animationDuration: "1s" }}
        />
      ))}
    </span>
  );
}

/** Standalone typing bubble, shown before Astra's first word arrives. */
export function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <AstraAvatar />
      <div className="rounded-2xl rounded-tl-md bg-secondary px-4 py-3">
        <TypingDots />
      </div>
    </div>
  );
}

export function TutorMessageView({
  message,
  streaming,
  isLast,
  resolving = false,
  onRate,
  onEdit,
  onAction,
  onResolve,
  onChoose,
}: {
  message: TutorMessage;
  streaming: boolean;
  isLast: boolean;
  /** True while approve or dismiss is in flight. */
  resolving?: boolean;
  onRate: (id: string, rating: "up" | "down") => void;
  /** Present only on a stopped prompt that can be pulled back into the composer. */
  onEdit?: () => void;
  onAction: (action: TutorAction, label: string) => void;
  onResolve?: (approved: boolean, args?: Record<string, unknown>) => void;
  /** Sends a practice-question choice as the next student message. */
  onChoose?: (text: string) => void;
}) {
  if (message.role === "student") {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {message.text}
        </p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit message"
            className="flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-muted transition-colors hover:text-foreground"
          >
            <LuPencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>
    );
  }

  if (message.role === "system") return null;

  const tools = message.tools ?? [];
  const blocks = message.blocks ?? [];
  // An empty draft is covered by the conversation's typing bubble.
  if (
    message.text === "" &&
    !message.actionProposal &&
    tools.length === 0 &&
    blocks.length === 0
  ) {
    return null;
  }
  const plan = message.actionProposal?.summary.trim() ?? "";
  // The stored reply is the plan itself. Keep it out of the bubble; the card opens it.
  const showText = message.text.trim() !== "" && message.text.trim() !== plan;
  const awaiting = Boolean(message.actionProposal);
  const finished =
    !streaming && message.text !== "" && !message.stopped && !awaiting;
  const sources = message.groundedOn?.filter(Boolean) ?? [];

  return (
    <div className="flex items-start gap-2.5">
      <AstraAvatar />
      <div
        className={cn(
          "min-w-0",
          message.actionProposal ? "max-w-full" : "max-w-[85%]",
        )}
      >
        {showText && (
          <div className="rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
            <TutorMarkdown content={message.text} streaming={streaming} />
          </div>
        )}

        {tools.length > 0 && (
          <ul className={cn("space-y-1.5", showText && "mt-2")} aria-label="Steps Astra took">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </ul>
        )}

        {blocks.length > 0 && (
          <div className={cn("space-y-2", (showText || tools.length > 0) && "mt-2")}>
            {blocks.map((block) => (
              <StudyBlock
                key={block.id}
                block={block}
                onChoose={streaming ? undefined : onChoose}
              />
            ))}
          </div>
        )}

        {message.actionProposal && onResolve && (
          <ActionCard
            key={message.actionProposal.actionId}
            proposal={message.actionProposal}
            busy={resolving || streaming}
            className={showText ? "mt-2" : undefined}
            onResolve={onResolve}
          />
        )}

        {message.stopped && (
          <p className="mt-1 px-1 text-xs text-muted">Stopped</p>
        )}

        {finished && sources.length > 0 && (
          <SourcesRow sources={sources} />
        )}

        {finished && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {(["up", "down"] as const).map((rating) => {
              const Icon = rating === "up" ? LuThumbsUp : LuThumbsDown;
              const active = message.rating === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onRate(message.id, rating)}
                  aria-label={rating === "up" ? "Helpful" : "Not helpful"}
                  aria-pressed={active}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-secondary hover:text-foreground",
                    active && "bg-primary-soft text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            {isLast && (
              <button
                type="button"
                onClick={() =>
                  onAction("explain_differently", "Explain differently")
                }
                className="min-h-8 rounded-full border border-border px-3 text-xs font-semibold text-muted transition-colors hover:text-foreground"
              >
                Explain differently
              </button>
            )}
            {isLast &&
              message.suggested?.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => onAction(action, SUGGESTION_LABELS[action])}
                  className="min-h-8 rounded-full border border-border px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                >
                  {SUGGESTION_LABELS[action]}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCard({ tool }: { tool: TutorToolCall }) {
  const title = toolCardTitle(tool.name, tool.summary);
  const detail =
    title === tool.summary.trim() || tool.summary.trim() === ""
      ? null
      : tool.summary;
  const Icon =
    tool.phase === "done" ? LuCheck : tool.phase === "failed" ? LuCircleX : LuLoader;
  return (
    <li className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 h-3.5 w-3.5 flex-shrink-0",
          tool.phase === "failed" ? "text-danger" : "text-primary",
          tool.phase === "running" && "motion-safe:animate-spin",
        )}
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
        {tool.phase === "failed" && (
          <p className="text-xs text-danger">Did not finish</p>
        )}
      </div>
    </li>
  );
}

function StudyBlock({
  block,
  onChoose,
}: {
  block: TutorUiBlock;
  onChoose?: (text: string) => void;
}) {
  if (block.component === "worked_example") {
    return (
      <div className="rounded-xl border border-border bg-card px-3.5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Worked example
        </p>
        <div className="mt-2 text-sm leading-relaxed text-foreground">
          <TutorMarkdown content={block.props.problem} />
        </div>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-relaxed text-foreground">
          {block.props.steps.map((step, index) => (
            <li key={index}>
              <TutorMarkdown content={step} />
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Practice
      </p>
      <div className="mt-2 text-sm leading-relaxed text-foreground">
        <TutorMarkdown content={block.props.prompt} />
      </div>
      {block.props.choices && block.props.choices.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {block.props.choices.map((choice, index) => (
            <button
              key={`${index}-${choice}`}
              type="button"
              disabled={!onChoose}
              onClick={() => onChoose?.(choice)}
              className="min-h-8 rounded-full border border-border px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
            >
              {choice}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  proposal,
  busy,
  className,
  onResolve,
}: {
  proposal: ActionProposal;
  busy: boolean;
  className?: string;
  onResolve: (approved: boolean, args?: Record<string, unknown>) => void;
}) {
  const title = actionTitle(proposal.tool);
  const danger = actionIsDanger(proposal);
  const editable = canEditProposal(proposal);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => fieldValues(proposal));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function approve() {
    if (!editable) {
      onResolve(true);
      return;
    }
    const result = proposalEdits(proposal, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onResolve(true, result.args);
  }

  return (
    <div
      role="region"
      aria-label={title}
      aria-busy={busy}
      className={cn(
        "rounded-xl border border-border bg-card px-3.5 py-3",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-foreground">
        <TutorMarkdown content={proposal.summary} />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="mt-2 text-xs font-semibold text-primary disabled:opacity-50"
      >
        Review plan
      </button>
      <div className="mt-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onResolve(false)}
          className={buttonClass("outline", "lg")}
        >
          Not now
        </button>
      </div>
      <Modal
        open={open}
        title={title}
        busy={busy}
        onClose={() => setOpen(false)}
        className="max-w-2xl"
        overlayClassName="z-[80]"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve(false)}
              className={buttonClass("outline", "lg")}
            >
              Not now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={approve}
              className={buttonClass(danger ? "danger" : "primary", "lg")}
            >
              {actionConfirmLabel(proposal)}
            </button>
          </div>
        }
      >
        <TutorMarkdown content={proposal.summary} />
        {editable && (
          <div className="mt-3 space-y-3">
            {proposal.fields?.map((field) => (
              <label key={field.key} className="block">
                <span className="text-xs font-semibold text-muted">
                  {field.label}
                </span>
                <input
                  value={values[field.key] ?? ""}
                  disabled={busy}
                  inputMode={field.type === "number" ? "decimal" : "text"}
                  maxLength={field.maxLength}
                  aria-invalid={errors[field.key] ? true : undefined}
                  onChange={(event) => {
                    const next = event.target.value;
                    setValues((current) => ({ ...current, [field.key]: next }));
                    setErrors((current) => {
                      if (!current[field.key]) return current;
                      const copy = { ...current };
                      delete copy[field.key];
                      return copy;
                    });
                  }}
                  className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
                />
                {errors[field.key] && (
                  <span className="mt-1 block text-xs text-danger">
                    {errors[field.key]}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function SourcesRow({ sources }: { sources: GroundedOn[] }) {
  const openPanel = useTutorStore((s) => s.openPanel);

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Sources">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Sources
      </span>
      {sources.map((src, i) => {
        const label = src.title?.trim() || src.sourceType || "Source";
        const title = src.excerpt?.trim() || label;
        const key = `${src.docId ?? src.lessonId ?? src.questionId ?? src.resourceId ?? i}-${label}`;

        if (src.sourceType === "question" && src.questionId) {
          return (
            <button
              key={key}
              type="button"
              title={title}
              onClick={() =>
                openPanel({
                  context: {
                    type: "question",
                    questionId: src.questionId!,
                    subjectId: src.subjectId,
                    topicId: src.topicId,
                  },
                  label,
                })
              }
              className="max-w-full truncate rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary-soft"
            >
              {label}
            </button>
          );
        }

        return (
          <span
            key={key}
            title={title}
            className="max-w-full truncate rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
