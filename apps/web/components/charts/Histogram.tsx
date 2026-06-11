"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

function bandColor(mid: number) {
  if (mid > 0.66) return "#ff5577";
  if (mid > 0.33) return "#f7b956";
  return "#2ee79b";
}

export function Histogram({
  data,
  xKey = "bin_mid",
  yKey = "count",
  height = 220,
}: {
  data: any[];
  xKey?: string;
  yKey?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1a2740" vertical={false} strokeDasharray="2 4" />
        <XAxis dataKey={xKey} stroke="#5a6477" fontSize={11} tickFormatter={(v) => Number(v).toFixed(2)} />
        <YAxis stroke="#5a6477" fontSize={11} />
        <Tooltip
          cursor={{ fill: "rgba(0,180,216,0.04)" }}
          contentStyle={{ background: "#0b1220", border: "1px solid #25395f", borderRadius: 4, color: "#e6edf6", fontSize: 12 }}
          labelFormatter={(l) => `risk ≈ ${Number(l).toFixed(2)}`}
        />
        <Bar dataKey={yKey} radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={bandColor(Number(d.bin_mid))} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
