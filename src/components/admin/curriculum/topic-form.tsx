"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/admin/status-banner";
import {
  useCreateTopic,
  useUpdateTopic,
  type TopicInput,
} from "@/hooks/api/use-admin-curriculum";
import type { AdminCurriculumOut, AdminTopicOut } from "@/lib/api/types";
import { scopeLabel, type ClassLevel, type Term } from "@/lib/curriculum-scope";

/** The API stores weights as 0–1; editors think in percent. */
const toPercent = (w: number) => String(Math.round(w * 100));
const fromPercent = (v: string) => Math.min(100, Math.max(0, Number(v) || 0)) / 100;

export function TopicForm({
  curriculumId,
  topic,
  slots,
  onClose,
}: {
  curriculumId: string;
  /** Omit to create. */
  topic?: AdminTopicOut;
  /** The subject's term slots, offered as move targets when editing. */
  slots: AdminCurriculumOut[];
  onClose: () => void;
}) {
  const create = useCreateTopic();
  const update = useUpdateTopic();
  const pending = create.isPending || update.isPending;
  const [error, setError] = useState("");
  const [title, setTitle] = useState(topic?.title ?? "");
  const [minutes, setMinutes] = useState(String(topic?.estimatedMinutes ?? 45));
  const [waec, setWaec] = useState(toPercent(topic?.waecWeight ?? 0));
  const [jamb, setJamb] = useState(toPercent(topic?.jambWeight ?? 0));
  const [slotId, setSlotId] = useState(topic?.curriculumLevelId ?? curriculumId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const body: TopicInput = {
      title: title.trim(),
      estimatedMinutes: Math.min(600, Math.max(1, Math.round(Number(minutes) || 45))),
      waecWeight: fromPercent(waec),
      jambWeight: fromPercent(jamb),
    };
    try {
      if (topic) {
        await update.mutateAsync({
          id: topic.id,
          body: slotId !== topic.curriculumLevelId ? { ...body, curriculumLevelId: slotId } : body,
        });
      } else {
        await create.mutateAsync({ curriculumId, body });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the topic.");
    }
  }

  return (
    <Modal
      open
      title={topic ? "Edit topic" : "New topic"}
      busy={pending}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="topic-form" size="sm" disabled={pending}>
            {pending ? "Saving…" : topic ? "Save changes" : "Add topic"}
          </Button>
        </div>
      }
    >
      <form id="topic-form" onSubmit={submit} className="space-y-4">
        {error && <StatusBanner tone="error" title={error} />}
        <label className="block text-sm">
          <span className="label">Title</span>
          <input
            className="input"
            value={title}
            maxLength={200}
            required
            placeholder="Quadratic equations"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="label">Study time (min)</span>
            <input
              className="input"
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="label">WAEC weight (%)</span>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              value={waec}
              onChange={(e) => setWaec(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="label">JAMB weight (%)</span>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              value={jamb}
              onChange={(e) => setJamb(e.target.value)}
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-muted">
          Weight is the share of exam questions this topic is expected to supply.
        </p>
        {topic && slots.length > 1 && (
          <label className="block text-sm">
            <span className="label">Taught in</span>
            <select className="input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {scopeLabel({ classLevel: s.classLevel as ClassLevel, term: s.term as Term })}
                </option>
              ))}
            </select>
          </label>
        )}
      </form>
    </Modal>
  );
}
