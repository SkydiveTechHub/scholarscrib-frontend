"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminTable, AdminTd, AdminTh, AdminTr } from "@/components/admin/admin-table";
import { StatusBanner } from "@/components/admin/status-banner";
import { buttonClass } from "@/components/ui/button";
import {
  useCreateBillingFeature,
  usePatchBillingEntitlement,
  usePatchBillingPlan,
  useSeedBillingCatalog,
} from "@/hooks/api/use-admin-billing";
import type { BillingCatalog, BillingPlanRow } from "@/lib/admin-data";
import { isApiError } from "@/lib/api/errors";

function nairaFromKobo(kobo: number): string {
  return (kobo / 100).toFixed(0);
}

function koboFromNairaInput(raw: string): number {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function BillingCatalogManager({ catalog }: { catalog: BillingCatalog }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const patchPlan = usePatchBillingPlan();
  const patchEntitlement = usePatchBillingEntitlement();
  const createFeature = useCreateBillingFeature();
  const seed = useSeedBillingCatalog();

  const busy =
    pending ||
    patchPlan.isPending ||
    patchEntitlement.isPending ||
    createFeature.isPending ||
    seed.isPending;

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function run(action: () => Promise<unknown>, okMessage: string) {
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(okMessage);
      refresh();
    } catch (e) {
      setError(isApiError(e) ? e.message : "Could not save billing catalog.");
    }
  }

  return (
    <div className="space-y-8">
      {error && <StatusBanner tone="error" title={error} />}
      {notice && <StatusBanner tone="success" title={notice} />}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={buttonClass("secondary", "md")}
          disabled={busy}
          onClick={() =>
            void run(
              () => seed.mutateAsync(),
              "Seeded catalog from code defaults (upsert).",
            )
          }
        >
          Reseed defaults
        </button>
        <p className="text-sm text-muted">
          Edits apply to live gates within about a minute. New feature codes still
          need route gating in the API before they enforce access — see{" "}
          <code className="text-xs">docs/billing-catalog-ops.md</code>.
        </p>
      </div>

      {catalog.plans.map((plan) => (
        <PlanCard
          key={plan.code}
          plan={plan}
          disabled={busy}
          onSavePlan={(patch) =>
            void run(
              () => patchPlan.mutateAsync({ code: plan.code, ...patch }),
              `Saved ${plan.displayName}.`,
            )
          }
          onSaveFeature={(featureCode, patch) =>
            void run(
              () =>
                patchEntitlement.mutateAsync({
                  planCode: plan.code,
                  featureCode,
                  ...patch,
                }),
              `Updated ${featureCode} on ${plan.code}.`,
            )
          }
        />
      ))}

      <NewFeatureForm
        disabled={busy}
        onCreate={(input) =>
          void run(
            () => createFeature.mutateAsync(input),
            `Created feature ${input.code}. Attach privileges per plan above.`,
          )
        }
      />
    </div>
  );
}

function PlanCard({
  plan,
  disabled,
  onSavePlan,
  onSaveFeature,
}: {
  plan: BillingPlanRow;
  disabled: boolean;
  onSavePlan: (patch: {
    displayName?: string;
    blurb?: string | null;
    amountKobo?: number;
    isPurchasable?: boolean;
    active?: boolean;
  }) => void;
  onSaveFeature: (
    featureCode: string,
    patch: { enabled?: boolean; privilegeValue?: unknown },
  ) => void;
}) {
  const [displayName, setDisplayName] = useState(plan.displayName);
  const [blurb, setBlurb] = useState(plan.blurb ?? "");
  const [naira, setNaira] = useState(nairaFromKobo(plan.amountKobo));
  const [purchasable, setPurchasable] = useState(plan.isPurchasable);
  const [active, setActive] = useState(plan.active);

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">
          {plan.displayName}{" "}
          <span className="text-sm font-semibold text-muted">({plan.code})</span>
        </h2>
        <p className="text-xs text-muted">
          rank {plan.rank} · {plan.currency} · {plan.interval}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="label">Display name</span>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="text-sm">
          <span className="label">Price (₦ / month)</span>
          <input
            className="input"
            inputMode="numeric"
            value={naira}
            onChange={(e) => setNaira(e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={purchasable}
            onChange={(e) => setPurchasable(e.target.checked)}
            disabled={disabled}
          />
          Purchasable at checkout
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={disabled}
          />
          Active in catalog
        </label>
        <label className="text-sm sm:col-span-2 lg:col-span-4">
          <span className="label">Blurb</span>
          <input
            className="input"
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            disabled={disabled}
          />
        </label>
      </div>

      <button
        type="button"
        className={buttonClass("primary", "sm")}
        disabled={disabled}
        onClick={() =>
          onSavePlan({
            displayName,
            blurb: blurb || null,
            amountKobo: koboFromNairaInput(naira),
            isPurchasable: purchasable,
            active,
          })
        }
      >
        Save plan
      </button>

      <AdminTable caption={`Features for ${plan.code}`}>
        <thead>
          <tr>
            <AdminTh>Feature</AdminTh>
            <AdminTh>Type</AdminTh>
            <AdminTh>Enabled</AdminTh>
            <AdminTh>Privilege</AdminTh>
            <AdminTh>
              <span className="sr-only">Save</span>
            </AdminTh>
          </tr>
        </thead>
        <tbody>
          {plan.features.map((feature) => (
            <FeatureRow
              key={feature.code}
              feature={feature}
              disabled={disabled}
              onSave={onSaveFeature}
            />
          ))}
        </tbody>
      </AdminTable>
    </section>
  );
}

function FeatureRow({
  feature,
  disabled,
  onSave,
}: {
  feature: BillingPlanRow["features"][number];
  disabled: boolean;
  onSave: (
    featureCode: string,
    patch: { enabled?: boolean; privilegeValue?: unknown },
  ) => void;
}) {
  const [enabled, setEnabled] = useState(feature.enabled);
  const [value, setValue] = useState(formatValue(feature.value));

  function parsedValue(): unknown {
    if (feature.valueType === "boolean") return value === "true";
    if (feature.valueType === "integer") {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    return value;
  }

  return (
    <AdminTr>
      <AdminTd>
        <div className="font-semibold">{feature.name}</div>
        <div className="text-xs text-muted">{feature.code}</div>
      </AdminTd>
      <AdminTd className="text-xs">{feature.valueType}</AdminTd>
      <AdminTd>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={disabled}
          aria-label={`Enable ${feature.code}`}
        />
      </AdminTd>
      <AdminTd>
        {feature.valueType === "select" && feature.selectOptions ? (
          <select
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
          >
            <option value="">—</option>
            {feature.selectOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : feature.valueType === "boolean" ? (
          <select
            className="input"
            value={value || "false"}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
          />
        )}
      </AdminTd>
      <AdminTd className="text-right">
        <button
          type="button"
          className={buttonClass("ghost", "sm")}
          disabled={disabled}
          onClick={() =>
            onSave(feature.code, {
              enabled,
              privilegeValue: parsedValue(),
            })
          }
        >
          Save
        </button>
      </AdminTd>
    </AdminTr>
  );
}

function NewFeatureForm({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (input: {
    code: string;
    name: string;
    valueType: "boolean" | "integer" | "select";
    selectOptions?: string[] | null;
    gateKey?: string | null;
    description?: string | null;
  }) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [valueType, setValueType] = useState<"boolean" | "integer" | "select">(
    "boolean",
  );
  const [options, setOptions] = useState("");
  const [gateKey, setGateKey] = useState("");
  const [description, setDescription] = useState("");

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({
          code: code.trim(),
          name: name.trim(),
          valueType,
          selectOptions:
            valueType === "select"
              ? options
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : null,
          gateKey: gateKey.trim() || null,
          description: description.trim() || null,
        });
      }}
    >
      <h2 className="text-lg font-bold text-foreground">Add feature</h2>
      <p className="text-sm text-muted">
        Creates a catalog feature and disabled rows on every plan. Wire{" "}
        <code className="text-xs">GATE_TO_FEATURE</code> +{" "}
        <code className="text-xs">require_feature</code> before it enforces access.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          <span className="label">Code</span>
          <input
            className="input"
            placeholder="mock_exams"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            pattern="[a-z][a-z0-9_]*"
            disabled={disabled}
          />
        </label>
        <label className="text-sm">
          <span className="label">Name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={disabled}
          />
        </label>
        <label className="text-sm">
          <span className="label">Value type</span>
          <select
            className="input"
            value={valueType}
            onChange={(e) =>
              setValueType(e.target.value as "boolean" | "integer" | "select")
            }
            disabled={disabled}
          >
            <option value="boolean">boolean</option>
            <option value="integer">integer</option>
            <option value="select">select</option>
          </select>
        </label>
        {valueType === "select" && (
          <label className="text-sm sm:col-span-2">
            <span className="label">Select options (comma-separated)</span>
            <input
              className="input"
              placeholder="basic, full"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              disabled={disabled}
            />
          </label>
        )}
        <label className="text-sm">
          <span className="label">Gate key (optional)</span>
          <input
            className="input"
            placeholder="mockExams"
            value={gateKey}
            onChange={(e) => setGateKey(e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="label">Description</span>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled}
          />
        </label>
      </div>
      <button type="submit" className={buttonClass("primary", "md")} disabled={disabled}>
        Create feature
      </button>
    </form>
  );
}
