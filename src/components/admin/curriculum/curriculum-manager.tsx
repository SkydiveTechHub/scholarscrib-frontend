"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  LuArrowDown,
  LuArrowUp,
  LuClock,
  LuPencil,
  LuPlus,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";
import { Badge } from "@/components/admin/badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusBanner } from "@/components/admin/status-banner";
import { SubjectForm, trackLabel } from "@/components/admin/curriculum/subject-form";
import { TopicForm } from "@/components/admin/curriculum/topic-form";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useAdminCurriculums,
  useAdminSubjects,
  useAdminTopics,
  useCreateCurriculum,
  useDeleteCurriculum,
  useDeleteSubject,
  useDeleteTopic,
  useSaveSubject,
  useUpdateTopic,
} from "@/hooks/api/use-admin-curriculum";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";
import { queryKeys } from "@/lib/api/query-keys";
import type { AdminCurriculumOut, AdminSubjectOut, AdminTopicOut } from "@/lib/api/types";
import {
  CLASS_LEVELS,
  TERMS,
  TERM_LABELS,
  scopeLabel,
  type ClassLevel,
  type Term,
} from "@/lib/curriculum-scope";
import { cn } from "@/lib/utils";

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

type Confirm =
  | { kind: "subject"; subject: AdminSubjectOut }
  | { kind: "slot"; slot: AdminCurriculumOut; topicCount: number }
  | { kind: "topic"; topic: AdminTopicOut };

export function CurriculumManager({ canEdit }: { canEdit: boolean }) {
  const subjects = useAdminSubjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<"new" | AdminSubjectOut | null>(null);

  if (subjects.isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  if (subjects.isError) {
    return (
      <StatusBanner
        tone="error"
        title={errorText(subjects.error, "Could not load subjects.")}
        action={
          <Button variant="outline" size="sm" onClick={() => subjects.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const list = subjects.data;
  const selected = list.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
      <SubjectList
        subjects={list}
        selectedId={selected?.id ?? null}
        canEdit={canEdit}
        onSelect={setSelectedId}
        onNew={() => setSubjectForm("new")}
      />

      {selected ? (
        <SubjectDetail
          key={selected.id}
          subject={selected}
          canEdit={canEdit}
          onEdit={() => setSubjectForm(selected)}
          onDeleted={() => setSelectedId(null)}
        />
      ) : (
        <EmptyState
          title={list.length === 0 ? "No subjects yet" : "Pick a subject"}
          message={
            list.length === 0
              ? canEdit
                ? "Add the first subject to start building its syllabus."
                : "The owner hasn't added any subjects yet."
              : "Its term slots and topics will show here."
          }
          action={
            list.length === 0 && canEdit ? (
              <Button size="sm" onClick={() => setSubjectForm("new")}>
                <LuPlus className="h-4 w-4" /> New subject
              </Button>
            ) : undefined
          }
          className="py-20"
        />
      )}

      {subjectForm && (
        <SubjectForm
          subject={subjectForm === "new" ? undefined : subjectForm}
          onClose={() => setSubjectForm(null)}
          onSaved={(saved) => {
            setSelectedId(saved.id);
            setSubjectForm(null);
          }}
        />
      )}
    </div>
  );
}

/* ─── Subject list ─────────────────────────────────────────────────────── */

function SubjectList({
  subjects,
  selectedId,
  canEdit,
  onSelect,
  onNew,
}: {
  subjects: AdminSubjectOut[];
  selectedId: string | null;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? subjects.filter((s) => `${s.name} ${s.code ?? ""}`.toLowerCase().includes(q))
      : subjects;
  }, [subjects, query]);

  return (
    <section aria-label="Subjects" className="min-w-0 lg:sticky lg:top-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            type="search"
            aria-label="Search subjects"
            placeholder="Search subjects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {canEdit && (
          <Button size="icon" aria-label="New subject" onClick={onNew}>
            <LuPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted">
          {subjects.length === 0 ? "No subjects yet." : `Nothing matches “${query}”.`}
        </p>
      ) : (
        <ul className="max-h-[28rem] divide-y divide-border-strong overflow-y-auto rounded-lg border border-border-strong bg-card lg:max-h-[calc(100vh-10rem)]">
          {visible.map((s) => {
            const active = s.id === selectedId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "relative flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60",
                    active ? "bg-secondary" : "hover:bg-secondary/60",
                  )}
                >
                  {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {s.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {[s.code, trackLabel(s.trackCategory)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {s.isActive === false ? (
                    <Badge tone="warning">Hidden</Badge>
                  ) : (
                    <span className="flex-shrink-0 text-xs tabular-nums text-muted">
                      {s._count?.topics ?? 0} topics
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ─── Subject detail ───────────────────────────────────────────────────── */

function SubjectDetail({
  subject,
  canEdit,
  onEdit,
  onDeleted,
}: {
  subject: AdminSubjectOut;
  canEdit: boolean;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const curriculums = useAdminCurriculums(subject.id);
  const createSlot = useCreateCurriculum();
  const deleteSubject = useDeleteSubject();
  const saveSubject = useSaveSubject();
  const [visibilityError, setVisibilityError] = useState("");
  const deleteSlot = useDeleteCurriculum();
  const deleteTopic = useDeleteTopic();

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState<"new" | AdminTopicOut | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmError, setConfirmError] = useState("");
  const [slotError, setSlotError] = useState("");

  const slots = useMemo(() => curriculums.data ?? [], [curriculums.data]);
  const slotAt = (classLevel: ClassLevel, term: Term) =>
    slots.find((c) => c.classLevel === classLevel && c.term === term);

  // One topic query per slot, shared with the panel below via the same keys,
  // so every cell can show its count without a second round trip.
  const topicQueries = useQueries({
    queries: slots.map((slot) => ({
      queryKey: queryKeys.admin.curriculumTopics(slot.id),
      queryFn: async () =>
        (
          await request<{ topics: AdminTopicOut[] }>({
            url: endpoints.admin.curriculums.topics(slot.id),
            realm: "admin",
          })
        ).topics,
    })),
  });
  const topicCount = (slotId: string): number | null => {
    const i = slots.findIndex((s) => s.id === slotId);
    return topicQueries[i]?.data?.length ?? null;
  };

  const activeSlot = slots.find((s) => s.id === activeSlotId) ?? null;
  const totalTopics = subject._count?.topics ?? 0;
  const totalQuestions = subject._count?.questions ?? 0;

  async function addSlot(classLevel: ClassLevel, term: Term) {
    setSlotError("");
    try {
      const created = await createSlot.mutateAsync({ subjectId: subject.id, classLevel, term });
      setActiveSlotId(created.id);
    } catch (e) {
      setSlotError(errorText(e, "Could not add the term slot."));
    }
  }

  async function toggleActive(next: boolean) {
    setVisibilityError("");
    try {
      await saveSubject.mutateAsync({ id: subject.id, body: { isActive: next } });
    } catch (e) {
      setVisibilityError(errorText(e, "Could not change visibility."));
    }
  }

  function openConfirm(next: Confirm) {
    setConfirmError("");
    setConfirm(next);
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmError("");
    try {
      if (confirm.kind === "subject") {
        await deleteSubject.mutateAsync(confirm.subject.id);
        onDeleted();
      } else if (confirm.kind === "slot") {
        await deleteSlot.mutateAsync(confirm.slot.id);
        if (activeSlotId === confirm.slot.id) setActiveSlotId(null);
      } else {
        await deleteTopic.mutateAsync(confirm.topic.id);
      }
      setConfirm(null);
    } catch (e) {
      setConfirmError(errorText(e, "Could not delete."));
    }
  }

  const confirmBusy = deleteSubject.isPending || deleteSlot.isPending || deleteTopic.isPending;
  const confirmCopy = confirm && describeConfirm(confirm, totalQuestions);

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-xl font-bold tracking-tight text-foreground">
            {subject.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {subject.code && <Badge>{subject.code}</Badge>}
            <Badge>{trackLabel(subject.trackCategory)}</Badge>
            {subject.isWaec && <Badge tone="info">WAEC</Badge>}
            {subject.isJamb && <Badge tone="info">JAMB</Badge>}
            {subject.isNeco && <Badge tone="info">NECO</Badge>}
          </div>
          <p className="mt-2 text-sm text-muted">
            {totalTopics} {totalTopics === 1 ? "topic" : "topics"} · {totalQuestions}{" "}
            {totalQuestions === 1 ? "question" : "questions"}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <LuPencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-danger"
              onClick={() => openConfirm({ kind: "subject", subject })}
            >
              <LuTrash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        )}
      </header>

      <VisibilityRow
        active={subject.isActive !== false}
        canEdit={canEdit}
        pending={saveSubject.isPending}
        error={visibilityError}
        onChange={toggleActive}
      />

      {/* The syllabus: SS1–SS3 down, three terms across. Each cell is one
          curriculum level and holds its topics. */}
      <section aria-labelledby="slots-heading">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 id="slots-heading" className="text-sm font-bold text-foreground">
            Term slots
          </h3>
          {canEdit && <span className="text-xs text-muted">Select an empty slot to add it.</span>}
        </div>
        {slotError && <StatusBanner tone="error" title={slotError} className="mb-3" />}
        {curriculums.isPending ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : curriculums.isError ? (
          <StatusBanner
            tone="error"
            title={errorText(curriculums.error, "Could not load term slots.")}
          />
        ) : (
          <div className="overflow-x-auto">
            <div
              role="group"
              aria-label={`${subject.name} term slots`}
              className="grid min-w-[30rem] grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] gap-2"
            >
              <span />
              {TERMS.map((term) => (
                <span key={term} className="px-1 text-xs font-semibold text-muted">
                  {TERM_LABELS[term]}
                </span>
              ))}
              {CLASS_LEVELS.map((level) => (
                <SlotRow
                  key={level}
                  level={level}
                  slotAt={slotAt}
                  topicCount={topicCount}
                  activeSlotId={activeSlotId}
                  canEdit={canEdit}
                  adding={createSlot.isPending}
                  onOpen={setActiveSlotId}
                  onAdd={addSlot}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {activeSlot ? (
        <TopicPanel
          key={activeSlot.id}
          slot={activeSlot}
          canEdit={canEdit}
          onAdd={() => setTopicForm("new")}
          onEdit={setTopicForm}
          onDeleteTopic={(topic) => openConfirm({ kind: "topic", topic })}
          onDeleteSlot={(count) => openConfirm({ kind: "slot", slot: activeSlot, topicCount: count })}
        />
      ) : (
        slots.length > 0 && (
          <EmptyState
            variant="plain"
            title="Select a slot to see its topics"
            className="rounded-lg border border-dashed border-border-strong py-8"
          />
        )
      )}

      {topicForm && activeSlot && (
        <TopicForm
          curriculumId={activeSlot.id}
          topic={topicForm === "new" ? undefined : topicForm}
          slots={slots}
          onClose={() => setTopicForm(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description ?? ""}
        confirmLabel="Delete"
        busy={confirmBusy}
        disabled={confirmCopy?.blocked}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      >
        {confirmError && <StatusBanner tone="error" title={confirmError} className="mt-3" />}
      </ConfirmDialog>
    </div>
  );
}

function describeConfirm(confirm: Confirm, questionCount: number) {
  if (confirm.kind === "subject") {
    const blocked = questionCount > 0;
    return {
      title: `Delete ${confirm.subject.name}?`,
      description: blocked
        ? `${questionCount} ${questionCount === 1 ? "question still uses" : "questions still use"} this subject. Move or delete them in Questions first.`
        : "This removes the subject. It can't be undone.",
      blocked,
    };
  }
  if (confirm.kind === "slot") {
    const label = scopeLabel({
      classLevel: confirm.slot.classLevel as ClassLevel,
      term: confirm.slot.term as Term,
    });
    const blocked = confirm.topicCount > 0;
    return {
      title: `Remove ${label}?`,
      description: blocked
        ? `This slot still has ${confirm.topicCount} ${confirm.topicCount === 1 ? "topic" : "topics"}. Delete or move them first.`
        : "The slot is removed from this subject's syllabus.",
      blocked,
    };
  }
  return {
    title: `Delete “${confirm.topic.title}”?`,
    description:
      "Topics that have questions can't be deleted. Move the questions to another topic first.",
    blocked: false,
  };
}

/* ─── Classroom visibility ─────────────────────────────────────────────── */

function VisibilityRow({
  active,
  canEdit,
  pending,
  error,
  onChange,
}: {
  active: boolean;
  canEdit: boolean;
  pending: boolean;
  error: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <section
      aria-label="Classroom visibility"
      className="rounded-lg border border-border-strong bg-card px-4 py-3"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p id="visibility-label" className="text-sm font-semibold text-foreground">
            {active ? "Active in the classroom" : "Hidden from the classroom"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {active
              ? "Students can open this subject and its topics."
              : "Students can't see this subject or open its topics. Nothing is deleted."}
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-labelledby="visibility-label"
            disabled={pending}
            onClick={() => onChange(!active)}
            className={cn(
              "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "bg-success" : "bg-border-strong",
            )}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
                active && "translate-x-5",
              )}
            />
          </button>
        ) : (
          <Badge tone={active ? "success" : "warning"}>{active ? "Active" : "Hidden"}</Badge>
        )}
      </div>
      {error && <StatusBanner tone="error" title={error} className="mt-3" />}
    </section>
  );
}

/* ─── Slot grid ────────────────────────────────────────────────────────── */

function SlotRow({
  level,
  slotAt,
  topicCount,
  activeSlotId,
  canEdit,
  adding,
  onOpen,
  onAdd,
}: {
  level: ClassLevel;
  slotAt: (l: ClassLevel, t: Term) => AdminCurriculumOut | undefined;
  topicCount: (slotId: string) => number | null;
  activeSlotId: string | null;
  canEdit: boolean;
  adding: boolean;
  onOpen: (id: string) => void;
  onAdd: (l: ClassLevel, t: Term) => void;
}) {
  return (
    <>
      <span className="flex items-center text-sm font-bold text-foreground">{level}</span>
      {TERMS.map((term) => {
        const slot = slotAt(level, term);
        const label = scopeLabel({ classLevel: level, term });
        if (slot) {
          const count = topicCount(slot.id);
          const active = slot.id === activeSlotId;
          return (
            <button
              key={term}
              type="button"
              aria-pressed={active}
              aria-label={`${label}, ${count ?? "…"} topics`}
              onClick={() => onOpen(slot.id)}
              className={cn(
                "flex h-16 flex-col items-start justify-center rounded-lg border px-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                active
                  ? "border-primary bg-primary-soft"
                  : "border-border-strong bg-card hover:border-primary/40",
              )}
            >
              <span className="text-lg font-bold leading-none tabular-nums text-foreground">
                {count ?? "–"}
              </span>
              <span className="mt-1 text-xs text-muted">{count === 1 ? "topic" : "topics"}</span>
            </button>
          );
        }
        return canEdit ? (
          <button
            key={term}
            type="button"
            aria-label={`Add ${label}`}
            disabled={adding}
            onClick={() => onAdd(level, term)}
            className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border-strong text-muted transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-50"
          >
            <LuPlus className="h-4 w-4" />
          </button>
        ) : (
          <span
            key={term}
            aria-label={`${label}, not set up`}
            className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted"
          >
            Not set up
          </span>
        );
      })}
    </>
  );
}

/* ─── Topics in one slot ───────────────────────────────────────────────── */

function TopicPanel({
  slot,
  canEdit,
  onAdd,
  onEdit,
  onDeleteTopic,
  onDeleteSlot,
}: {
  slot: AdminCurriculumOut;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (topic: AdminTopicOut) => void;
  onDeleteTopic: (topic: AdminTopicOut) => void;
  onDeleteSlot: (topicCount: number) => void;
}) {
  const topics = useAdminTopics(slot.id);
  const update = useUpdateTopic();
  const [moveError, setMoveError] = useState("");

  const ordered = useMemo(
    () =>
      [...(topics.data ?? [])].sort(
        (a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title),
      ),
    [topics.data],
  );

  /** Swap with a neighbour. Positions come from the list, not the stored
   *  indices, so duplicate or gappy orderIndex values still reorder cleanly. */
  async function move(index: number, by: -1 | 1) {
    const a = ordered[index];
    const b = ordered[index + by];
    if (!a || !b) return;
    setMoveError("");
    try {
      await Promise.all([
        update.mutateAsync({ id: a.id, body: { orderIndex: index + by } }),
        update.mutateAsync({ id: b.id, body: { orderIndex: index } }),
      ]);
    } catch (e) {
      setMoveError(errorText(e, "Could not reorder the topics."));
    }
  }

  const label = scopeLabel({ classLevel: slot.classLevel as ClassLevel, term: slot.term as Term });

  return (
    <section aria-labelledby="topics-heading" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="topics-heading" className="text-base font-bold text-foreground">
          {label} topics
        </h3>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" onClick={onAdd}>
              <LuPlus className="h-3.5 w-3.5" /> Add topic
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-danger"
              disabled={!topics.data}
              onClick={() => onDeleteSlot(topics.data?.length ?? 0)}
            >
              <LuTrash2 className="h-3.5 w-3.5" /> Remove slot
            </Button>
          </div>
        )}
      </div>

      {moveError && <StatusBanner tone="error" title={moveError} className="mb-3" />}

      {topics.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : topics.isError ? (
        <StatusBanner tone="error" title={errorText(topics.error, "Could not load topics.")} />
      ) : ordered.length === 0 ? (
        <EmptyState
          title={`No topics in ${label} yet`}
          message={canEdit ? "Add the first topic taught this term." : undefined}
          action={
            canEdit ? (
              <Button size="sm" onClick={onAdd}>
                <LuPlus className="h-3.5 w-3.5" /> Add topic
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ol className="divide-y divide-border-strong overflow-hidden rounded-lg border border-border-strong bg-card">
          {ordered.map((topic, i) => (
            <li key={topic.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <span className="w-6 flex-shrink-0 text-right text-sm tabular-nums text-muted">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-foreground">{topic.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <LuClock className="h-3 w-3" /> {topic.estimatedMinutes} min
                  </span>
                  <span>WAEC {Math.round(topic.waecWeight * 100)}%</span>
                  <span>JAMB {Math.round(topic.jambWeight * 100)}%</span>
                </p>
              </div>
              {canEdit && (
                <div className="flex flex-shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${topic.title} up`}
                    disabled={i === 0 || update.isPending}
                    onClick={() => move(i, -1)}
                  >
                    <LuArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${topic.title} down`}
                    disabled={i === ordered.length - 1 || update.isPending}
                    onClick={() => move(i, 1)}
                  >
                    <LuArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${topic.title}`}
                    onClick={() => onEdit(topic)}
                  >
                    <LuPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-danger"
                    aria-label={`Delete ${topic.title}`}
                    onClick={() => onDeleteTopic(topic)}
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
