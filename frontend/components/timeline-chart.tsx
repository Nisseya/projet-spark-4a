"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Point = { date: string; count: number };

export default function TimelineChart({
  data,
  title,
  color = "#6366f1",
}: {
  data: Point[];
  title?: string;
  color?: string;
}) {
  return (
    <div className="h-64 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      {title && (
        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </div>
      )}
      <div className="h-[calc(100%-1.5rem)]">
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 12, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#27272a"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: 8,
                fontSize: 12,
              }}
              cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.3 }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={2}
              fill="url(#timelineFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
