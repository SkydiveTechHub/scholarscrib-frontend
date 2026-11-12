"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LuLink,
  LuMail,
  LuPlus,
  LuRefreshCw,
  LuTrash2,
  LuUserMinus,
  LuUsers,
} from "react-icons/lu";
import { CenterEmptyState } from "@/components/center-app/center-empty-state";
import { CenterFreeCapBanner } from "@/components/center-app/center-free-cap-banner";
import { CenterInviteShare } from "@/components/center-app/center-invite-share";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import {
  useCenterGroups,
  useCenterInvites,
  useCenterRoster,
  useCreateCenterGroup,
  useCreateCenterInvite,
  useDeleteCenterGroup,
  useRegenerateCenterInvite,
  useRemoveRosterMember,
  useRevokeCenterInvite,
} from "@/hooks/api/use-center";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isApiError } from "@/lib/api/errors";
import type { CenterInviteOut, CenterRosterMemberOut } from "@/lib/api/types";
import { CENTER_FREE_ACTIVE_STUDENT_LIMIT } from "@/lib/center-subjects";
import { cn } from "@/lib/utils";

function statusBadge(status: string) {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return <Badge variant="green">Active</Badge>;
    case "INVITED":
      return <Badge variant="amber">Invited</Badge>;
    case "LEFT":
      return <Badge variant="neutral">Left</Badge>;
    case "REMOVED":
      return <Badge variant="red">Removed</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

function memberName(m: CenterRosterMemberOut) {
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return name || "Student";
}

function membershipKey(m: CenterRosterMemberOut) {
  return m.membershipId || m.id || "";
}

/** Open WhatsApp/share link — not email-bound. */
function openShareInvite(invites: CenterInviteOut[] | undefined) {
  return (
    (invites ?? []).find((i) => !i.revokedAt && !i.boundEmail) ?? null
  );
}

function pendingEmailInvites(invites: CenterInviteOut[] | undefined) {
  return (invites ?? []).filter((i) => !i.revokedAt && Boolean(i.boundEmail));
}

export function CenterRosterPanel({
  preferredCenterId,
}: {
  preferredCenterId?: string | null;
} = {}) {
  const { centersQuery, center, centerId, hasMultiple } =
    useActiveCenter(preferredCenterId);

  const rosterQuery = useCenterRoster(centerId);
  const groupsQuery = useCenterGroups(centerId);
  const invitesQuery = useCenterInvites(centerId);

  const createInvite = useCreateCenterInvite(centerId ?? "");
  const revokeInvite = useRevokeCenterInvite(centerId ?? "");
  const regenerateInvite = useRegenerateCenterInvite(centerId ?? "");
  const removeMember = useRemoveRosterMember(centerId ?? "");
  const createGroup = useCreateCenterGroup(centerId ?? "");
  const deleteGroup = useDeleteCenterGroup(centerId ?? "");

  const [shareTarget, setShareTarget] = useState<CenterInviteOut | null>(null);
  const [groupName, setGroupName] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const members = rosterQuery.data?.members ?? [];
  const activeMembers = useMemo(
    () =>
      members.filter((m) => (m.status || "").toUpperCase() === "ACTIVE"),
    [members],
  );
  const pendingMembers = useMemo(
    () =>
      members.filter((m) => (m.status || "").toUpperCase() === "INVITED"),
    [members],
  );
  const invite = openShareInvite(invitesQuery.data?.invites);
  const emailedInvites = useMemo(
    () => pendingEmailInvites(invitesQuery.data?.invites),
    [invitesQuery.data?.invites],
  );
  const activeCount =
    rosterQuery.data?.activeCount ?? activeMembers.length;
  const activeLimit =
    rosterQuery.data?.activeLimit ??
    center?.activeStudentLimit ??
    (center?.plan === "FREE" || !center?.plan
      ? CENTER_FREE_ACTIVE_STUDENT_LIMIT
      : null);
  const plan = rosterQuery.data?.plan ?? center?.plan ?? "FREE";

  if (centersQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (centersQuery.isError) {
    return (
      <CenterEmptyState
        title="Could not load centers"
        message="Check your connection and try again."
      />
    );
  }

  if (!center) {
    return (
      <div className="space-y-4">
        <CenterEmptyState
          title="No center yet"
          message="Create your center, then invite students with a WhatsApp-friendly link."
        />
        <Link
          href="/center/onboarding"
          className={buttonClass("primary", "md", "w-full sm:w-auto")}
        >
          Set up your center
        </Link>
      </div>
    );
  }

  async function runAction(fn: () => Promise<unknown>) {
    setActionError("");
    setActionNotice("");
    try {
      await fn();
    } catch (err) {
      setActionError(
        isApiError(err)
          ? err.message || "That action failed."
          : "That action failed. Try again.",
      );
    }
  }

  async function sendEmailInvite() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setActionError("Enter a valid student email address.");
      return;
    }
    await runAction(async () => {
      const out = await createInvite.mutateAsync({ email: trimmed });
      setEmail("");
      if (out.emailSent === false) {
        setActionNotice(
          `Invite created for ${out.invite.boundEmail}, but the email could not be sent. Share the link manually.`,
        );
        setShareTarget(out.invite);
      } else {
        setActionNotice(`Invite emailed to ${out.invite.boundEmail}.`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <CenterFreeCapBanner
        plan={plan}
        activeCount={activeCount}
        activeLimit={activeLimit}
      />

      {actionError && (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm font-medium text-danger">
          {actionError}
        </div>
      )}
      {actionNotice && !actionError && (
        <div className="rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm font-medium text-success">
          {actionNotice}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Invite by email
              {hasMultiple ? (
                <span className="font-semibold text-muted">
                  {" "}
                  · {center.name}
                </span>
              ) : null}
            </h2>
            <p className="text-sm text-muted">
              Sends a single-use link that only that student can accept.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setActionNotice("");
            }}
            placeholder="student@email.com"
            className="w-full flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            disabled={createInvite.isPending}
          />
          <Button
            type="button"
            size="md"
            disabled={createInvite.isPending}
            onClick={() => void sendEmailInvite()}
            className="w-full sm:w-auto"
          >
            <LuMail className="h-3.5 w-3.5" />
            {createInvite.isPending ? "Sending…" : "Email invite"}
          </Button>
        </div>
        {emailedInvites.length > 0 ? (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {emailedInvites.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {row.boundEmail}
                  </p>
                  <p className="font-mono text-xs tracking-wider text-muted">
                    {row.code}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShareTarget(row)}
                  >
                    <LuLink className="h-3.5 w-3.5" /> Copy link
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={busyInviteId === row.id}
                    onClick={() => {
                      setBusyInviteId(row.id);
                      void runAction(async () => {
                        await revokeInvite.mutateAsync(row.id);
                      }).finally(() => setBusyInviteId(null));
                    }}
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Invite link</h2>
            <p className="text-sm text-muted">
              Shareable with anyone. Revoke or regenerate anytime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {invite ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShareTarget(invite)}
                >
                  <LuLink className="h-3.5 w-3.5" /> Share
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyInviteId === invite.id}
                  onClick={() => {
                    setBusyInviteId(invite.id);
                    void runAction(async () => {
                      await regenerateInvite.mutateAsync(invite.id);
                    }).finally(() => setBusyInviteId(null));
                  }}
                >
                  <LuRefreshCw className="h-3.5 w-3.5" /> Regenerate
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={busyInviteId === invite.id}
                  onClick={() => {
                    setBusyInviteId(invite.id);
                    void runAction(async () => {
                      await revokeInvite.mutateAsync(invite.id);
                    }).finally(() => setBusyInviteId(null));
                  }}
                >
                  Revoke
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={createInvite.isPending}
                onClick={() =>
                  void runAction(async () => {
                    const out = await createInvite.mutateAsync({});
                    setShareTarget(out.invite);
                  })
                }
              >
                <LuPlus className="h-3.5 w-3.5" /> Create invite
              </Button>
            )}
          </div>
        </div>

        {invite && (
          <p className="rounded-xl border border-border bg-secondary px-3 py-2 font-mono text-sm tracking-wider">
            {invite.code}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">
            Active students ({activeMembers.length}
            {activeLimit != null ? ` / ${activeLimit}` : ""})
          </h2>
        </div>
        {rosterQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : activeMembers.length === 0 ? (
          <CenterEmptyState
            title="No students yet"
            message="Share your invite link. Students appear here after they accept."
          />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {activeMembers.map((m) => (
              <li
                key={membershipKey(m)}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {memberName(m)}
                  </p>
                  <p className="text-xs text-muted">
                    {[m.classLevel, m.track].filter(Boolean).join(" · ") ||
                      "Level not set"}
                    {m.joinedAt
                      ? ` · Joined ${new Date(m.joinedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(m.status)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${memberName(m)}`}
                    disabled={removeMember.isPending}
                    onClick={() =>
                      void runAction(() =>
                        removeMember.mutateAsync(membershipKey(m)),
                      )
                    }
                  >
                    <LuUserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingMembers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">
            Pending invites ({pendingMembers.length})
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {pendingMembers.map((m) => (
              <li
                key={membershipKey(m)}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <p className="text-sm font-semibold">{memberName(m)}</p>
                {statusBadge(m.status)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <LuUsers className="h-4 w-4" /> Groups
          </h2>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!groupName.trim()) return;
            void runAction(async () => {
              await createGroup.mutateAsync({ name: groupName.trim() });
              setGroupName("");
            });
          }}
        >
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. SS3 Science"
            className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
          <Button
            type="submit"
            variant="secondary"
            size="md"
            disabled={createGroup.isPending || !groupName.trim()}
          >
            Add
          </Button>
        </form>

        {(groupsQuery.data?.groups ?? []).length === 0 ? (
          <p className="text-sm text-muted">
            No groups yet. Create one to organise students for assignments.
          </p>
        ) : (
          <ul className="space-y-2">
            {(groupsQuery.data?.groups ?? []).map((g) => (
              <li
                key={g.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3",
                )}
              >
                <div>
                  <p className="text-sm font-semibold">{g.name}</p>
                  <p className="text-xs text-muted">
                    {g.memberCount ?? g.membershipIds?.length ?? 0} students
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete group ${g.name}`}
                  disabled={deleteGroup.isPending}
                  onClick={() =>
                    void runAction(() => deleteGroup.mutateAsync(g.id))
                  }
                >
                  <LuTrash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
        title="Share invite"
        description={
          shareTarget?.boundEmail
            ? `Bound to ${shareTarget.boundEmail}.`
            : "Send this to students on WhatsApp."
        }
      >
        {shareTarget && (
          <CenterInviteShare
            centerName={center.name}
            code={shareTarget.code}
            url={shareTarget.link ?? shareTarget.url}
          />
        )}
      </Modal>
    </div>
  );
}
