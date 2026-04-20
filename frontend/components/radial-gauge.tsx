"use client";

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";

export default function RadialGauge({
  value,
  max = 100,
  label,
  sublabel,
  color = "#6366f1",
}: {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  color?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const data = [{ name: label, value: pct, fill: color }];

  return (
    <div className="relative h-48 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="80%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: "#27272a" }}
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-6">
        <div className="font-mono text-3xl font-semibold tabular-nums text-zinc-100">
          {value.toFixed(value < 10 ? 1 : 0)}
          <span className="text-base text-zinc-500">
            {max === 100 ? "%" : ""}
          </span>
        </div>
        {sublabel && (
          <div className="text-[11px] text-zinc-500">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
