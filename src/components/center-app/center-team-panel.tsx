"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LuCheck,
  LuCopy,
  LuShare2,
  LuTrash2,
  LuUserPlus,
} from "react-icons/lu";
import { CenterEmptyState } from "@/components/center-app/center-empty-state";
import { StatusBanner } from "@/components/admin/status-banner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useCenterFacilitators,
  useInviteFacilitator,
  useRevokeFacilitatorInvite,
  useRevokeFacilitatorMember,
} from "@/hooks/api/use-center-facilitators";
import { useActiveCenter } from "@/hooks/use-active-center";
import { isApiError } from "@/lib/api/errors";
import type { CenterFacilitatorInviteOut } from "@/lib/api/types";
import {
  resolveFacilitatorInviteUrl,
  whatsappFacilitatorInviteUrl,
} from "@/lib/center-invite";
import {
  CENTER_PLAN_LABELS,
  CENTER_PRO_YEARLY_KOBO,
  CENTER_TEAM_YEARLY_KOBO,
  centerAllowsFacilitators,
  centerMaxFacilitators,
  isCenterOwnerRole,
} from "@/lib/center-subjects";
import { amountLabel } from "@/lib/billing-plans";

export function CenterTeamPanel({
  preferredCenterId,
}: {
  preferredCenterId?: string | null;
}) {
  const { centersQuery, center, centerId } = useActiveCenter(preferredCenterId);
  const plan = (center?.plan ?? "FREE").toUpperCase();
  const canInviteFacilitators = centerAllowsFacilitators(plan);
  const isOwner = isCenterOwnerRole(center?.staffRole ?? "owner");

  const teamQuery = useCenterFacilitators(centerId);
  const invite = useInviteFacilitator(centerId ?? "");
  const revokeMember = useRevokeFacilitatorMember(centerId ?? "");
  const revokeInvite = useRevokeFacilitatorInvite(centerId ?? "");

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CenterFacilitatorInviteOut | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const seats = teamQuery.data?.seats;
  const maxFacilitators =
    seats?.maxFacilitators ?? centerMaxFacilitators(plan);
  const used = seats?.used ?? 0;
  const canManage = teamQuery.data?.canManage ?? isOwner;
  const facilitators = teamQuery.data?.facilitators ?? [];
  const pending = teamQuery.data?.pendingInvites ?? [];
  const atCap = used >= maxFacilitators;

  async function createInvite() {
    if (!centerId || !canManage) return;
    setError(null);
    setCreated(null);
    try {
      const out = await invite.mutateAsync({
        email: email.trim() || undefined,
        expiresInDays: 14,
      });
      setCreated(out.invite);
      setEmail("");
    } catch (err) {
      if (isApiError(err)) {
        if (err.code === "CENTER_TEAM_REQUIRED") {
          setError(
            "Facilitators require Pro or Team. Upgrade on Billing to invite facilitators.",
          );
          return;
        }
        if (err.code === "CENTER_FACILITATOR_CAP") {
          setError(
            `This center already has the maximum of ${maxFacilitators} facilitators.`,
          );
          return;
        }
        setError(err.message || "Could not create invite.");
        return;
      }
      setError("Could not create invite. Try again.");
    }
  }

  async function onRevokeMember(membershipId: string) {
    if (!centerId) return;
    setBusyId(membershipId);
    setError(null);
    try {
      await revokeMember.mutateAsync(membershipId);
    } catch (err) {
      setError(
        isApiError(err) ? err.message : "Could not remove facilitator.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onRevokeInvite(inviteId: string) {
    if (!centerId) return;
    setBusyId(inviteId);
    setError(null);
    try {
      await revokeInvite.mutateAsync(inviteId);
      if (created?.id === inviteId) setCreated(null);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Could not revoke invite.");
    } finally {
      setBusyId(null);
    }
  }

  if (centersQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!center) {
    return (
      <div className="space-y-4">
        <CenterEmptyState
          title="No center yet"
          message="Create your center first, then invite facilitators on Pro or Team."
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

  return (
    <div className="max-w-2xl space-y-5">
      {error && <StatusBanner tone="error" title={error} />}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-foreground">{center.name}</h2>
          <Badge variant={canInviteFacilitators ? "green" : "amber"}>
            {CENTER_PLAN_LABELS[plan] ?? plan}
          </Badge>
          {!isOwner && <Badge variant="neutral">Facilitator</Badge>}
        </div>
        <p className="mt-2 text-sm text-muted">
          {canInviteFacilitators
            ? `${CENTER_PLAN_LABELS[plan] ?? plan} seats: ${used} of ${maxFacilitators} facilitators used (active + pending invites).`
            : "Facilitators are available on Pro (up to 3) or Team (up to 5)."}
        </p>
      </section>

      {!canInviteFacilitators && (
        <div className="space-y-3">
          <CenterEmptyState
            title="Upgrade to add facilitators"
            message={`Free is solo (owner-only). Pro (${amountLabel(CENTER_PRO_YEARLY_KOBO)}/year) includes up to 3 facilitators; Team (${amountLabel(CENTER_TEAM_YEARLY_KOBO)}/year) includes up to 5.`}
          />
          {isOwner && (
            <Link
              href="/center/billing"
              className={buttonClass("primary", "md", "w-full sm:w-auto")}
            >
              View plans
            </Link>
          )}
        </div>
      )}

      {canInviteFacilitators && teamQuery.isLoading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {canInviteFacilitators && teamQuery.isError && (
        <StatusBanner
          tone="error"
          title="Could not load team."
          message="Refresh and try again."
        />
      )}

      {canInviteFacilitators && !teamQuery.isLoading && (
        <>
          {canManage && (
            <section className="space-y-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <LuUserPlus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Invite a facilitator
                </h3>
              </div>
              <p className="text-sm text-muted">
                They sign in with a tutor account and accept the link. Optional:
                bind the invite to an email.
              </p>
              {atCap ? (
                <StatusBanner
                  tone="info"
                  title={`All ${maxFacilitators} facilitator seats are taken.`}
                  message="Revoke a pending invite or remove a facilitator to free a seat."
                />
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    onClick={createInvite}
                    disabled={invite.isPending}
                  >
                    {invite.isPending ? "Creating…" : "Create invite"}
                  </Button>
                </div>
              )}
              {created && (
                <FacilitatorInviteShare
                  centerName={center.name}
                  invite={created}
                />
              )}
            </section>
          )}

          {!canManage && (
            <StatusBanner
              tone="info"
              title="You can view the team."
              message="Only the center owner can invite or revoke facilitators."
            />
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              Active facilitators
            </h3>
            {facilitators.length === 0 ? (
              <CenterEmptyState
                title="No facilitators yet"
                message={
                  canManage
                    ? "Create an invite link and share it with a tutor you trust."
                    : "The owner has not added facilitators to this center."
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {facilitators.map((f) => {
                  const name =
                    [f.firstName, f.lastName].filter(Boolean).join(" ").trim() ||
                    f.email ||
                    "Facilitator";
                  return (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {name}
                        </p>
                        {f.email && (
                          <p className="text-xs text-muted">{f.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="green">Active</Badge>
                        {canManage && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === f.id}
                            onClick={() => onRevokeMember(f.id)}
                            aria-label={`Remove ${name}`}
                          >
                            <LuTrash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              Pending invites
            </h3>
            {pending.length === 0 ? (
              <p className="text-sm text-muted">No open facilitator invites.</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((inv) => (
                  <li key={inv.id}>
                    <FacilitatorInviteShare
                      centerName={center.name}
                      invite={inv}
                      onRevoke={
                        canManage
                          ? () => onRevokeInvite(inv.id)
                          : undefined
                      }
                      revoking={busyId === inv.id}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function FacilitatorInviteShare({
  centerName,
  invite,
  onRevoke,
  revoking,
}: {
  centerName: string;
  invite: CenterFacilitatorInviteOut;
  onRevoke?: () => void;
  revoking?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const link = resolveFacilitatorInviteUrl(invite);
  const wa = whatsappFacilitatorInviteUrl({
    centerName,
    code: invite.code,
    link: invite.link,
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked.
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Facilitator invite
          </p>
          {invite.boundEmail && (
            <p className="text-xs text-muted">Bound to {invite.boundEmail}</p>
          )}
        </div>
        <Badge variant="amber">Pending</Badge>
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          className="min-w-0 flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
        />
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={copy}
          aria-label="Copy invite link"
        >
          {copied ? (
            <LuCheck className="h-4 w-4" />
          ) : (
            <LuCopy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className={buttonClass("secondary", "sm")}
        >
          <LuShare2 className="mr-1.5 h-4 w-4" />
          WhatsApp
        </a>
        {onRevoke && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={revoking}
            onClick={onRevoke}
          >
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}
