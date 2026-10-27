"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LOW_SAMPLE, type PlotPoint } from "@/lib/admin-calibration";

/**
 * Predicted score against what students actually got right, one dot per score
 * band. A perfectly calibrated engine sits on the dashed diagonal: dots above
 * it mean students did better than the engine expected, dots below mean worse.
 *
 * One measure on one scale (both axes are percentages). Dots drawn hollow are
 * bands with too few answers to trust. The table under the chart carries every
 * figure, so the plot is never the only way to read them.
 */

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted)" };
const TICKS = [0, 20, 40, 60, 80, 100];
const DIAGONAL = [
  { x: 0, y: 0 },
  { x: 100, y: 100 },
];

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid var(--color-border-strong)",
  background: "var(--color-card)",
  color: "var(--color-foreground)",
  fontSize: 12,
  padding: "8px 10px",
};

const pct = (v: number | string) => `${v}%`;

function BandDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: PlotPoint }) {
  if (cx === undefined || cy === undefined || !payload) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={payload.lowSample ? "var(--color-card)" : "var(--color-primary)"}
      stroke="var(--color-primary)"
      strokeWidth={2}
    />
  );
}

function BandTooltip({ active, payload }: { active?: boolean; payload?: { payload?: unknown }[] }) {
  const point = payload?.map((entry) => entry.payload as PlotPoint | undefined).find((p) => p && "n" in p);
  if (!active || !point) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p className="font-semibold">Engine score {point.range}</p>
      <p>Engine expected about {point.x}%</p>
      <p>Students got {point.y}% right</p>
      <p className="text-muted">
        {point.n.toLocaleString("en-NG")} answers{point.lowSample ? " (low sample)" : ""}
      </p>
    </div>
  );
}

export function CalibrationChart({ points }: { points: PlotPoint[] }) {
  const description = points.length
    ? `Calibration chart with ${points.length} score bands. ${points
        .map((p) => `Engine ${p.x}%, students ${p.y}%`)
        .join("; ")}.`
    : "Calibration chart with no score bands yet.";

  return (
    <figure className="m-0">
      <div role="img" aria-label={description} className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 8, right: 16, bottom: 28, left: 8 }}>
            <CartesianGrid stroke="var(--color-border-strong)" strokeOpacity={0.5} vertical={false} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 100]}
              ticks={TICKS}
              tickFormatter={pct}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border-strong)" }}
              label={{
                value: "Engine's predicted score",
                position: "insideBottom",
                offset: -16,
                fontSize: 11,
                fill: "var(--color-muted)",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 100]}
              ticks={TICKS}
              tickFormatter={pct}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              label={{
                value: "Students got right",
                angle: -90,
                position: "insideLeft",
                offset: 8,
                fontSize: 11,
                fill: "var(--color-muted)",
              }}
            />
            <Tooltip content={<BandTooltip />} cursor={false} />
            <Line
              name="Perfect calibration"
              data={DIAGONAL}
              dataKey="y"
              stroke="var(--color-muted)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />
            <Line
              name="Actual result"
              data={points}
              dataKey="y"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={<BandDot />}
              activeDot={<BandDot />}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden>
            <circle cx="7" cy="7" r="5" fill="var(--color-primary)" stroke="var(--color-primary)" strokeWidth="2" />
          </svg>
          Actual result per score band
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden>
            <circle cx="7" cy="7" r="5" fill="var(--color-card)" stroke="var(--color-primary)" strokeWidth="2" />
          </svg>
          Fewer than {LOW_SAMPLE} answers
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden>
            <line x1="1" y1="5" x2="21" y2="5" stroke="var(--color-muted)" strokeWidth="1.5" strokeDasharray="5 4" />
          </svg>
          Perfect calibration
        </span>
      </figcaption>
    </figure>
  );
}
