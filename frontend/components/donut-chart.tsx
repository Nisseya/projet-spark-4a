"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

type Slice = { name: string; value: number };

const PALETTE = [
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#06b6d4", // cyan-500
  "#ef4444", // red-500
  "#a855f7", // purple-500
];

export default function DonutChart({
  data,
  title,
  centerLabel,
  centerValue,
}: {
  data: Slice[];
  title?: string;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = data.reduce((acc, s) => acc + s.value, 0);
  const displayValue = centerValue ?? total.toLocaleString("fr-FR");
  const displayLabel = centerLabel ?? "Total";

  return (
    <div className="h-80 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      {title && (
        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </div>
      )}
      <div className="relative h-[calc(100%-1.5rem)]">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
              stroke="#09090b"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: 8,
                fontSize: 12,
              }}
              itemStyle={{ color: "#e4e4e7" }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            {displayLabel}
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-zinc-100">
            {displayValue}
          </div>
        </div>
      </div>
    </div>
  );
}
