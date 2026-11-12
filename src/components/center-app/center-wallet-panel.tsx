"use client";

import { useMemo, useState } from "react";
import { StatusBanner } from "@/components/admin/status-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  readTokenPacks,
  useCenterTokenPacks,
} from "@/hooks/api/use-center-tokens";
import {
  readWalletBalance,
  useCenterWallet,
  useCenterWalletSpend,
  useCenterWalletWithdraw,
} from "@/hooks/api/use-center-wallet";
import { isApiError } from "@/lib/api/errors";
import type {
  CenterTokenPackOut,
  TutorWalletLedgerEntryOut,
  TutorWithdrawRequestOut,
} from "@/lib/api/types";
import { amountLabel } from "@/lib/billing-plans";
import {
  CENTER_WALLET_MIN_WITHDRAW_KOBO,
  REFERRAL_COMMISSION_PERCENT,
} from "@/lib/center-subjects";
import { cn } from "@/lib/utils";

const INPUT_CLS =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const LEDGER_LABELS: Record<string, string> = {
  COMMISSION: "Referral credit",
  REFUND_REVERSE: "Refund reversal",
  SPEND_TOKENS: "Spent on AI tokens",
  WITHDRAW_HOLD: "Withdraw hold",
  WITHDRAW_REJECT: "Withdraw returned",
  ADJUSTMENT: "Adjustment",
};

const WITHDRAW_LABELS: Record<string, string> = {
  PENDING: "Pending",
  FULFILLED: "Paid",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/**
 * Owner-only referral wallet (M7): balance, earn history, spend → tokens,
 * withdraw request. Mounted on /center/billing.
 */
export function CenterWalletPanel({
  centerId,
  className,
}: {
  centerId: string;
  className?: string;
}) {
  const walletQuery = useCenterWallet(true);
  const packsQuery = useCenterTokenPacks(centerId);
  const spend = useCenterWalletSpend(centerId);
  const withdraw = useCenterWalletWithdraw(centerId);

  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [spendError, setSpendError] = useState<string | null>(null);
  const [spendOk, setSpendOk] = useState<string | null>(null);

  const [amountNaira, setAmountNaira] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [note, setNote] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawOk, setWithdrawOk] = useState<string | null>(null);

  const wallet = walletQuery.data?.wallet;
  const balanceKobo =
    readWalletBalance(walletQuery.data) ?? wallet?.balanceKobo ?? 0;
  const minWithdraw =
    wallet?.minWithdrawKobo ?? CENTER_WALLET_MIN_WITHDRAW_KOBO;
  const commissionPercent =
    typeof wallet?.commissionBps === "number"
      ? wallet.commissionBps / 100
      : REFERRAL_COMMISSION_PERCENT;

  const packs = useMemo(() => {
    const fromCatalog = readTokenPacks(packsQuery.data);
    return fromCatalog.length > 0 ? fromCatalog : [];
  }, [packsQuery.data]);

  const ledgerEntries: TutorWalletLedgerEntryOut[] =
    walletQuery.data?.ledger ?? [];
  const withdrawals: TutorWithdrawRequestOut[] =
    walletQuery.data?.withdrawals ?? [];

  async function spendPack(pack: CenterTokenPackOut) {
    if (pack.amountKobo > balanceKobo) {
      setSpendError(
        `Need ${amountLabel(pack.amountKobo)} in your wallet for this pack.`,
      );
      return;
    }
    setBusyPack(pack.code);
    setSpendError(null);
    setSpendOk(null);
    try {
      await spend.mutateAsync(pack.code);
      setSpendOk(
        `Added ${pack.tokens.toLocaleString()} tokens to this center from your wallet.`,
      );
    } catch (err) {
      setSpendError(
        isApiError(err)
          ? err.message
          : "Could not spend wallet balance on tokens.",
      );
    } finally {
      setBusyPack(null);
    }
  }

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawOk(null);

    const naira = Number(amountNaira);
    if (!Number.isFinite(naira) || naira <= 0) {
      setWithdrawError("Enter a valid amount in naira.");
      return;
    }
    const amountKobo = Math.round(naira * 100);
    if (amountKobo < minWithdraw) {
      setWithdrawError(`Minimum withdraw is ${amountLabel(minWithdraw)}.`);
      return;
    }
    if (amountKobo > balanceKobo) {
      setWithdrawError("Amount is more than your available balance.");
      return;
    }
    if (!accountName.trim() || !accountNumber.trim() || !bankCode.trim()) {
      setWithdrawError("Account name, number, and bank code are required.");
      return;
    }

    setWithdrawBusy(true);
    try {
      await withdraw.mutateAsync({
        amountKobo,
        note: note.trim() || null,
        payoutDetails: {
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          bankCode: bankCode.trim(),
          bankName: bankName.trim() || null,
        },
      });
      setWithdrawOk(
        "Withdraw request submitted. Ops will fulfil it — this is not instant.",
      );
      setAmountNaira("");
      setNote("");
    } catch (err) {
      setWithdrawError(
        isApiError(err) ? err.message : "Could not submit withdraw request.",
      );
    } finally {
      setWithdrawBusy(false);
    }
  }

  if (walletQuery.isLoading && !walletQuery.data) {
    return (
      <section
        id="referral-wallet"
        className={cn(
          "scroll-mt-24 rounded-xl border border-border bg-card p-5",
          className,
        )}
      >
        <div className="flex justify-center py-10">
          <Spinner className="py-0" iconClassName="h-8 w-8" />
        </div>
      </section>
    );
  }

  if (walletQuery.isError && !walletQuery.data) {
    return (
      <section
        id="referral-wallet"
        className={cn("scroll-mt-24 space-y-3", className)}
      >
        <h2 className="text-base font-bold text-foreground">Referral wallet</h2>
        <StatusBanner
          tone="info"
          title="Could not load your wallet."
          message="Refresh shortly. If this keeps failing, contact support."
        />
      </section>
    );
  }

  return (
    <section
      id="referral-wallet"
      className={cn("scroll-mt-24 space-y-5", className)}
    >
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Referral wallet
            </h2>
            <p className="mt-1 text-sm text-muted">
              Earn {commissionPercent}% when a student you invited pays for a
              Standard or Premium term. Spend on AI tokens for this center, or
              request a withdrawal (verified tutors only).
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Balance
            </p>
            <p className="text-2xl font-extrabold text-foreground">
              {amountLabel(balanceKobo)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground">
          Use wallet for AI tokens
        </h3>
        <p className="mt-1 text-sm text-muted">
          Credits this center&apos;s Astra pool — same packs as Paystack, paid
          from wallet balance.
        </p>
        {spendError && (
          <StatusBanner tone="error" title={spendError} className="mt-3" />
        )}
        {spendOk && (
          <StatusBanner tone="success" title={spendOk} className="mt-3" />
        )}
        {packs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Token packs will appear once the catalog loads.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {packs.map((pack) => {
              const affordable = pack.amountKobo <= balanceKobo;
              return (
                <div
                  key={pack.code}
                  className="flex flex-col rounded-xl border border-border bg-background p-4"
                >
                  <p className="text-sm font-bold text-foreground">
                    {pack.label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {pack.tokens.toLocaleString()}{" "}
                    <span className="text-sm font-semibold text-muted">
                      tokens
                    </span>
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {amountLabel(pack.amountKobo)}
                  </p>
                  <Button
                    className="mt-3 w-full"
                    variant={affordable ? "primary" : "outline"}
                    disabled={!affordable || busyPack !== null}
                    onClick={() => void spendPack(pack)}
                  >
                    {busyPack === pack.code
                      ? "Applying…"
                      : affordable
                        ? "Use wallet"
                        : "Need more balance"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground">Earn history</h3>
        {ledgerEntries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No wallet activity yet. Credits appear when a referred student
            pays.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {ledgerEntries.map((entry) => (
              <LedgerRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground">
          Request a withdrawal
        </h3>
        <p className="mt-1 text-sm text-muted">
          Ops fulfils payouts manually (not instant). Minimum{" "}
          {amountLabel(minWithdraw)}. Your tutor account must be verified.
        </p>
        {withdrawError && (
          <StatusBanner tone="error" title={withdrawError} className="mt-3" />
        )}
        {withdrawOk && (
          <StatusBanner tone="success" title={withdrawOk} className="mt-3" />
        )}
        <form onSubmit={submitWithdraw} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Amount (₦)
            </span>
            <input
              className={INPUT_CLS}
              inputMode="decimal"
              value={amountNaira}
              onChange={(e) => setAmountNaira(e.target.value)}
              placeholder="e.g. 1500"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Account name
              </span>
              <input
                className={INPUT_CLS}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Account number
              </span>
              <input
                className={INPUT_CLS}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Bank code
              </span>
              <input
                className={INPUT_CLS}
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                placeholder="Paystack bank code"
                autoComplete="off"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Bank name (optional)
              </span>
              <input
                className={INPUT_CLS}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Note (optional)
            </span>
            <textarea
              className={cn(INPUT_CLS, "min-h-[72px] resize-y")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            disabled={withdrawBusy || balanceKobo < minWithdraw}
          >
            {withdrawBusy ? "Submitting…" : "Submit withdraw request"}
          </Button>
        </form>

        {withdrawals.length > 0 && (
          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Your requests
            </h4>
            <ul className="mt-2 divide-y divide-border">
              {withdrawals.map((row) => {
                const status = (row.status ?? "").toUpperCase();
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {amountLabel(row.amountKobo)}
                      </p>
                      <p className="text-xs text-muted">
                        {formatStamp(row.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        status === "FULFILLED"
                          ? "green"
                          : status === "REJECTED"
                            ? "amber"
                            : "neutral"
                      }
                    >
                      {WITHDRAW_LABELS[status] ?? row.status}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function LedgerRow({ entry }: { entry: TutorWalletLedgerEntryOut }) {
  const positive = entry.deltaKobo >= 0;
  const kind = (entry.kind ?? "").toUpperCase();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">
          {LEDGER_LABELS[kind] ?? entry.kind}
        </p>
        <p className="text-xs text-muted">
          {formatStamp(entry.createdAt)}
          {entry.studentName ? ` · ${entry.studentName}` : ""}
          {entry.centerName ? ` · ${entry.centerName}` : ""}
        </p>
      </div>
      <p
        className={cn(
          "font-bold tabular-nums",
          positive ? "text-success" : "text-foreground",
        )}
      >
        {positive ? "+" : "−"}
        {amountLabel(Math.abs(entry.deltaKobo))}
      </p>
    </li>
  );
}

function formatStamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
