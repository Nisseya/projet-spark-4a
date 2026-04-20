"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

type Row = {
  label: string;
  value: number;
  sublabel?: string;
};

type FormatKind = "number" | "duration_ms" | "duration_s" | "seconds";

const PALETTE = ["#6366f1", "#7c3aed", "#8b5cf6", "#a855f7", "#c084fc"];

function format(v: number, kind: FormatKind): string {
  switch (kind) {
    case "duration_ms": {
      const s = v / 1000;
      if (s < 60) return `${s.toFixed(1)}s`;
      const m = s / 60;
      if (m < 60) return `${m.toFixed(1)}min`;
      return `${(m / 60).toFixed(1)}h`;
    }
    case "duration_s": {
      if (v < 60) return `${v.toFixed(1)}s`;
      const m = v / 60;
      if (m < 60) return `${m.toFixed(1)}min`;
      return `${(m / 60).toFixed(1)}h`;
    }
    case "seconds":
      return `${v.toFixed(0)}s`;
    case "number":
    default:
      return v.toLocaleString("fr-FR");
  }
}

export default function HBarRanking({
  data,
  title,
  format: formatKind = "number",
  height = 360,
}: {
  data: Row[];
  title?: string;
  format?: FormatKind;
  height?: number;
}) {
  const chartData = data.map((r, i) => ({
    ...r,
    rank: i + 1,
    display: `#${i + 1} ${r.label}`,
  }));

  return (
    <div
      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
      style={{ height }}
    >
      {title && (
        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </div>
      )}
      <div className="h-[calc(100%-1.5rem)]">
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="#27272a"
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => format(Number(v), formatKind)}
            />
            <YAxis
              type="category"
              dataKey="display"
              stroke="#a1a1aa"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={160}
            />
            <Tooltip
              contentStyle={{
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: 8,
                fontSize: 12,
              }}
              cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
              labelStyle={{ color: "#a1a1aa" }}
              formatter={(value: any) => format(Number(value), formatKind)}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}