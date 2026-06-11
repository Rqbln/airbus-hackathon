"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, LabelList } from "recharts";

export function BarComparison({
  data,
  xKey,
  yKey,
  colorKey,
  defaultColor = "#00b4d8",
  domain,
  height = 280,
  showValueLabel = false,
}: {
  data: { [k: string]: any }[];
  xKey: string;
  yKey: string;
  colorKey?: string;
  defaultColor?: string;
  domain?: [number, number];
  height?: number;
  showValueLabel?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="#1a2740" vertical={false} strokeDasharray="2 4" />
        <XAxis
          dataKey={xKey}
          stroke="#5a6477"
          fontSize={11}
          interval={0}
          angle={-18}
          textAnchor="end"
          height={64}
          tickMargin={6}
        />
        <YAxis stroke="#5a6477" fontSize={11} domain={domain} tickFormatter={(v) => Number(v).toFixed(3)} />
        <Tooltip
          cursor={{ fill: "rgba(0,180,216,0.04)" }}
          contentStyle={{ background: "#0b1220", border: "1px solid #25395f", borderRadius: 4, color: "#e6edf6", fontSize: 12 }}
          formatter={(v: any) => (typeof v === "number" ? v.toFixed(4) : v)}
        />
        <Bar dataKey={yKey} fill={defaultColor} radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={(colorKey && d[colorKey]) || defaultColor} />
          ))}
          {showValueLabel && (
            <LabelList
              dataKey={yKey}
              position="top"
              formatter={(v: any) => (typeof v === "number" ? v.toFixed(3) : v)}
              fill="#8896ad"
              fontSize={10}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
