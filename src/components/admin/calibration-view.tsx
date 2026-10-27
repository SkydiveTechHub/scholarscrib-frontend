import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusBanner } from "@/components/admin/status-banner";
import { CalibrationChart } from "@/components/admin/calibration-chart";
import {
  AdminTable,
  AdminTd,
  AdminTh,
  AdminTr,
  HIDE_BELOW,
} from "@/components/admin/admin-table";
import { cn } from "@/lib/utils";
import {
  CALIBRATION_SOURCES,
  LOW_SAMPLE,
  SOURCE_LABELS,
  biasNote,
  calibrationUrlParams,
  formatPct,
  plotPoints,
  verdict,
  type CalibrationFilter,
  type CalibrationReport,
  type Summary,
  type VerdictTone,
} from "@/lib/admin-calibration";

const CARD = "rounded-lg border border-border-strong bg-card";
const INPUT_CLS =
  "w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
const LABEL_CLS = "text-[11px] font-semibold uppercase tracking-wider text-muted";

const BANNER: Record<VerdictTone, { tone: "success" | "error" | "info"; title: string }> = {
  none: { tone: "info", title: "Nothing recorded yet" },
  thin: { tone: "info", title: "Not enough data yet" },
  better: { tone: "success", title: "Better than guessing" },
  equal: { tone: "info", title: "About the same as guessing" },
  worse: { tone: "error", title: "Worse than guessing" },
};

const DIFFICULTY_ORDER = ["BASIC", "INTERMEDIATE", "ADVANCED", "UNKNOWN"];
const DIFFICULTY_LABELS: Record<string, string> = {
  BASIC: "Basic questions",
  INTERMEDIATE: "Intermediate questions",
  ADVANCED: "Advanced questions",
  UNKNOWN: "No difficulty set",
};

const num = (n: number) => n.toLocaleString("en-NG");
const score = (n: number) => n.toFixed(3);

/** The calibration page body. Pure of fetching, so it can be previewed with fixtures. */
export function CalibrationView({
  report,
  filter,
}: {
  report: CalibrationReport;
  filter: CalibrationFilter;
}) {
  const { overall } = report;
  const filtered = Object.keys(calibrationUrlParams(filter)).length > 0;
  const read = verdict(overall);
  const bias = biasNote(overall);

  return (
    <div>
      <PageHeader
        title="Calibration"
        description="Does the mastery engine's score match what students actually get right? Each answer is logged with the engine's prediction made just before it, then compared with the result."
      />

      <FilterForm filter={filter} />

      {overall.n === 0 ? (
        <EmptyState
          title={filtered ? "No predictions match these filters" : "No predictions recorded yet"}
          message={
            filtered
              ? "Widen the date range or clear the filters."
              : "Predictions are logged as students answer questions in exams, practice papers and lesson checks. Check back once students have been using the app."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <StatusBanner
            tone={BANNER[read.tone].tone}
            title={BANNER[read.tone].title}
            message={[read.text, bias].filter(Boolean).join(" ")}
          />

          <dl className={cn(CARD, "grid grid-cols-2 lg:grid-cols-4")}>
            <Tile label="Predictions logged" value={num(overall.n)} note="Answers scored so far" />
            <Tile
              label="Engine's average score"
              value={formatPct(overall.meanPredicted)}
              note={`Students got ${formatPct(overall.baseRate)} right`}
            />
            <Tile
              label="Accuracy score"
              value={score(overall.brier)}
              note={`Guessing the average: ${score(overall.baselineBrier)}. Lower is better.`}
            />
            <Tile
              label="Confidence penalty"
              value={score(overall.logLoss)}
              note={`Guessing the average: ${score(overall.baselineLogLoss)}. Lower is better.`}
            />
          </dl>

          <section className={cn(CARD, "p-4")}>
            <h2 className="text-sm font-semibold text-foreground">
              Predicted score against what students got right
            </h2>
            <p className="mb-3 mt-0.5 text-xs text-muted">
              Dots on the dashed line mean the engine was right on average. Dots above it mean
              students did better than expected; below it, worse.
            </p>
            <CalibrationChart points={plotPoints(report.buckets)} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-foreground">By score band</h2>
            <AdminTable caption="Engine's predicted score against the share students got right, by score band">
              <thead>
                <tr className="border-b border-border-strong">
                  <AdminTh>Engine score</AdminTh>
                  <AdminTh align="right">Engine expected</AdminTh>
                  <AdminTh align="right">Students got right</AdminTh>
                  <AdminTh align="right">Answers</AdminTh>
                </tr>
              </thead>
              <tbody>
                {report.buckets.map((bucket) => (
                  <AdminTr key={bucket.lower}>
                    <AdminTd className="font-medium text-foreground">
                      {Math.round(bucket.lower * 100)}–{Math.round(bucket.upper * 100)}%
                    </AdminTd>
                    <AdminTd align="right">{formatPct(bucket.meanPredicted)}</AdminTd>
                    <AdminTd align="right">{formatPct(bucket.observed)}</AdminTd>
                    <AdminTd align="right" className={bucket.n === 0 ? "text-muted" : undefined}>
                      {num(bucket.n)}
                      {bucket.n > 0 && bucket.lowSample && (
                        <span className="ml-1.5 text-[11px] text-muted">low sample</span>
                      )}
                    </AdminTd>
                  </AdminTr>
                ))}
              </tbody>
            </AdminTable>
            <p className="mt-2 text-xs text-muted">
              Bands with fewer than {LOW_SAMPLE} answers are too small to trust.
            </p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <SliceTable
              title="By amount of evidence"
              caption="Calibration split by how much the engine knew about the topic"
              rows={[
                { label: "Little evidence on the topic", summary: report.byEvidence.belowFloor },
                { label: "Enough evidence on the topic", summary: report.byEvidence.atOrAboveFloor },
              ]}
            />
            <SliceTable
              title="By question difficulty"
              caption="Calibration split by question difficulty"
              rows={Object.entries(report.byDifficulty)
                .sort(([a], [b]) => rank(a) - rank(b))
                .map(([key, summary]) => ({ label: DIFFICULTY_LABELS[key] ?? key, summary }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function rank(key: string): number {
  const found = DIFFICULTY_ORDER.indexOf(key);
  return found === -1 ? DIFFICULTY_ORDER.length : found;
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-border-strong p-4 [&:nth-child(-n+2)]:border-b [&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0 lg:[&:nth-child(-n+2)]:border-b-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted">{note}</dd>
    </div>
  );
}

function SliceTable({
  title,
  caption,
  rows,
}: {
  title: string;
  caption: string;
  rows: { label: string; summary: Summary }[];
}) {
  const shown = rows.filter((row) => row.summary.n > 0);
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      {shown.length === 0 ? (
        <EmptyState title="Nothing to show" message="No answers in this group yet." />
      ) : (
        <AdminTable caption={caption}>
          <thead>
            <tr className="border-b border-border-strong">
              <AdminTh>Group</AdminTh>
              <AdminTh align="right">Answers</AdminTh>
              <AdminTh align="right" className={HIDE_BELOW.sm}>
                Expected
              </AdminTh>
              <AdminTh align="right">Got right</AdminTh>
              <AdminTh align="right" className={HIDE_BELOW.md}>
                Accuracy score
              </AdminTh>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ label, summary }) => (
              <AdminTr key={label}>
                <AdminTd className="font-medium text-foreground">{label}</AdminTd>
                <AdminTd align="right">{num(summary.n)}</AdminTd>
                <AdminTd align="right" className={HIDE_BELOW.sm}>
                  {formatPct(summary.meanPredicted)}
                </AdminTd>
                <AdminTd align="right">{formatPct(summary.baseRate)}</AdminTd>
                <AdminTd align="right" className={HIDE_BELOW.md}>
                  {score(summary.brier)}
                </AdminTd>
              </AdminTr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </section>
  );
}

/** A plain GET form: the filter lives in the URL, so no client code is needed. */
function FilterForm({ filter }: { filter: CalibrationFilter }) {
  const active = Object.keys(calibrationUrlParams(filter)).length > 0;
  return (
    <form
      method="get"
      action="/admin/calibration"
      className="mb-4 grid grid-cols-2 items-end gap-3 rounded-lg border border-border-strong bg-card p-4 sm:flex sm:flex-wrap"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="cal-source" className={LABEL_CLS}>
          Source
        </label>
        <select id="cal-source" name="source" defaultValue={filter.source ?? ""} className={INPUT_CLS}>
          <option value="">All sources</option>
          {CALIBRATION_SOURCES.map((source) => (
            <option key={source} value={source}>
              {SOURCE_LABELS[source]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="cal-version" className={LABEL_CLS}>
          Scoring version
        </label>
        <input
          id="cal-version"
          name="scoringVersion"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          placeholder="All"
          defaultValue={filter.scoringVersion ?? ""}
          className={INPUT_CLS}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="cal-since" className={LABEL_CLS}>
          Since
        </label>
        <input
          id="cal-since"
          name="since"
          type="date"
          defaultValue={filter.since ? filter.since.toISOString().slice(0, 10) : ""}
          className={INPUT_CLS}
        />
      </div>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
        <Button type="submit" size="md">
          Apply
        </Button>
        {active && (
          <Link href="/admin/calibration" className={buttonClass("ghost", "md")}>
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
