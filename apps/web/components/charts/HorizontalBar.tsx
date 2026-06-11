"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function HorizontalBar({
  data,
  xKey,
  yKey,
  height = 520,
  labelWidth = 220,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  height?: number;
  labelWidth?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1a2740" horizontal={false} strokeDasharray="2 4" />
        <XAxis type="number" stroke="#5a6477" fontSize={10} />
        <YAxis
          type="category"
          dataKey={yKey}
          stroke="#8896ad"
          fontSize={10}
          width={labelWidth}
          tick={{ fontFamily: "JetBrains Mono, monospace" }}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,180,216,0.04)" }}
          contentStyle={{ background: "#0b1220", border: "1px solid #25395f", borderRadius: 4, color: "#e6edf6", fontSize: 12 }}
        />
        <Bar dataKey={xKey} fill="#00b4d8" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
