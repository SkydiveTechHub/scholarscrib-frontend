"use client";

import { useState } from "react";
import { LuCheck, LuCircleX, LuLoader } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { TutorMarkdown } from "@/components/tutor/tutor-markdown";
import { toolTitle } from "@/lib/admin-astra/labels";
import {
  canEditProposal,
  fieldValues,
  isDateField,
  proposalEdits,
} from "@/lib/admin-astra/proposals";
import type { AstraMessage, AstraProposal, AstraTool } from "@/lib/admin-astra/types";
import { cn } from "@/lib/utils";

const INPUT_CLS =
  "w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

export function AdminAstraMessage({
  message,
  streaming,
  cardError,
  resolving,
  onResolve,
}: {
  message: AstraMessage;
  streaming?: boolean;
  cardError?: string | null;
  resolving?: boolean;
  onResolve?: (approved: boolean, args?: Record<string, unknown> | null) => void;
}) {
  const mine = message.role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("min-w-0 max-w-[40rem] space-y-2", mine && "max-w-[32rem]")}>
        {message.tools && message.tools.length > 0 && (
          <ul className="space-y-1">
            {message.tools.map((tool) => (
              <li key={tool.id}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        )}
        {message.text !== "" && (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              mine
                ? "rounded-tr-md bg-primary text-primary-foreground"
                : "rounded-tl-md bg-secondary text-foreground",
            )}
          >
            {mine ? (
              <p className="whitespace-pre-wrap">{message.text}</p>
            ) : (
              <TutorMarkdown content={message.text} streaming={streaming} />
            )}
          </div>
        )}
        {message.result !== undefined && <ResultDisclosure result={message.result} />}
        {message.proposal && onResolve && (
          <ProposalCard
            key={message.proposal.actionId}
            proposal={message.proposal}
            cardError={cardError}
            resolving={resolving}
            onResolve={onResolve}
          />
        )}
        {message.settled && <SettledCard settled={message.settled} />}
      </div>
    </div>
  );
}

function ToolCard({ tool }: { tool: AstraTool }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted">
      {tool.phase === "done" ? (
        <LuCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
      ) : tool.phase === "failed" ? (
        <LuCircleX className="h-3.5 w-3.5 text-danger" aria-hidden />
      ) : (
        <LuLoader className="h-3.5 w-3.5 text-primary motion-safe:animate-spin" aria-hidden />
      )}
      <span>{toolTitle(tool.name, tool.summary)}</span>
      {tool.phase === "failed" && <span>Did not finish</span>}
    </div>
  );
}

function SettledCard({
  settled,
}: {
  settled: NonNullable<AstraMessage["settled"]>;
}) {
  const applied = settled.status === "executed";
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {applied ? "Applied" : "Dismissed"}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-foreground">{settled.summary}</p>
    </div>
  );
}

function ResultDisclosure({ result }: { result: unknown }) {
  return (
    <details className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted">
      <summary className="cursor-pointer text-foreground">Details</summary>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(result, null, 2)}
      </pre>
    </details>
  );
}

function formatArg(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function ProposalCard({
  proposal,
  cardError,
  resolving,
  onResolve,
}: {
  proposal: AstraProposal;
  cardError?: string | null;
  resolving?: boolean;
  onResolve: (approved: boolean, args?: Record<string, unknown> | null) => void;
}) {
  const editable = canEditProposal(proposal);
  const [values, setValues] = useState(() => fieldValues(proposal));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function approve() {
    if (!editable) {
      onResolve(true, null);
      return;
    }
    const edited = proposalEdits(proposal, values);
    if (!edited.ok) {
      setErrors(edited.errors);
      return;
    }
    setErrors({});
    onResolve(true, edited.args);
  }

  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3">
      <p className="whitespace-pre-wrap text-sm text-foreground">{proposal.summary}</p>
      {editable ? (
        <div className="mt-3 space-y-3">
          {proposal.fields?.map((field) => (
            <label key={field.key} className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">{field.label}</span>
              {field.type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={values[field.key] === true}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
              ) : (
                <input
                  className={INPUT_CLS}
                  type={isDateField(field.key) ? "date" : "text"}
                  inputMode={field.type === "number" ? "decimal" : undefined}
                  maxLength={field.maxLength}
                  value={typeof values[field.key] === "string" ? values[field.key] : ""}
                  aria-invalid={errors[field.key] ? true : undefined}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              )}
              {errors[field.key] && (
                <span className="mt-1 block text-xs text-danger">{errors[field.key]}</span>
              )}
            </label>
          ))}
        </div>
      ) : (
        <dl className="mt-3 space-y-1 text-xs">
          {Object.entries(proposal.args).map(([key, value]) => (
            <div key={key} className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-muted">{key}</dt>
              <dd className="break-words text-foreground">{formatArg(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {cardError && <p className="mt-3 text-sm text-danger">{cardError}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={approve} disabled={resolving}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => onResolve(false)} disabled={resolving}>
          Reject
        </Button>
      </div>
    </div>
  );
}
