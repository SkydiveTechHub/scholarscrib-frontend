import { requireTutorPage } from "@/lib/center-session";
import { PageHeader } from "@/components/ui/page-header";
import { CenterBillingPanel } from "@/components/center-app/center-billing-panel";
import { StatusBanner } from "@/components/admin/status-banner";

export const dynamic = "force-dynamic";

/** Outcomes shown after Paystack returns (or after center billing verify). */
const NOTICES: Record<
  string,
  { tone: "success" | "error" | "info"; title: string }
> = {
  success: {
    tone: "success",
    title: "Payment received — your center plan is active.",
  },
  tokens_success: {
    tone: "success",
    title: "Payment received — AI tokens were added to this center.",
  },
  failed: {
    tone: "error",
    title: "That payment did not go through. Nothing was charged.",
  },
  tokens_failed: {
    tone: "error",
    title: "That token purchase did not go through. Nothing was charged.",
  },
  missing: { tone: "error", title: "We could not identify that payment." },
};

export default async function CenterBillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    reference?: string;
    trxref?: string;
    kind?: string;
    centerId?: string;
  }>;
}) {
  await requireTutorPage();

  const params = await searchParams;
  const reference = params.reference || params.trxref;
  const isTokenReturn =
    params.kind === "tokens" ||
    params.kind === "token" ||
    params.status === "tokens_success" ||
    params.status === "tokens_failed";
  const status = params.status ?? (reference ? "pending" : undefined);
  const notice = status ? NOTICES[status] : undefined;

  return (
    <>
      <PageHeader
        title="Billing"
        description="Free (solo) for small rosters. Pro for unlimited students and up to 3 facilitators. Team for up to 5. Buy AI tokens for Tutor Astra."
      />
      <div className="space-y-5">
        {notice && <StatusBanner tone={notice.tone} title={notice.title} />}
        <CenterBillingPanel
          awaitingSettlement={status === "pending" && !isTokenReturn}
          settleReference={
            reference && !params.status && !isTokenReturn ? reference : null
          }
          tokenSettleReference={
            reference && !params.status && isTokenReturn ? reference : null
          }
          preferredCenterId={params.centerId ?? null}
        />
      </div>
    </>
  );
}
