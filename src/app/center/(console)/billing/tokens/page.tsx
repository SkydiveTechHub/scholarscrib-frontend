import { redirect } from "next/navigation";
import { requireTutorPage } from "@/lib/center-session";

export const dynamic = "force-dynamic";

/**
 * Paystack callback for AI token packs (BE sets
 * `/center/billing/tokens?centerId=…`). Normalize into the billing page
 * settle flow with `kind=tokens`.
 */
export default async function CenterTokenBillingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    centerId?: string;
    reference?: string;
    trxref?: string;
    status?: string;
  }>;
}) {
  await requireTutorPage();
  const params = await searchParams;
  const reference = params.reference || params.trxref;
  const qs = new URLSearchParams({ kind: "tokens" });
  if (params.centerId) qs.set("centerId", params.centerId);
  if (reference) qs.set("reference", reference);
  if (params.status) qs.set("status", params.status);
  redirect(`/center/billing?${qs.toString()}`);
}
