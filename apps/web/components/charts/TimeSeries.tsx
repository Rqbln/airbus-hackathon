"use client";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TimeSeries({
  data,
  xKey = "year_month",
  yKey = "corrosion_risk",
  height = 320,
  peakMonth,
}: {
  data: any[];
  xKey?: string;
  yKey?: string;
  height?: number;
  peakMonth?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00b4d8" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#00b4d8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1a2740" vertical={false} strokeDasharray="2 4" />
        <XAxis
          dataKey={xKey}
          stroke="#5a6477"
          fontSize={10}
          minTickGap={28}
          tickMargin={4}
        />
        <YAxis stroke="#5a6477" fontSize={11} domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} />
        <Tooltip
          cursor={{ stroke: "#25395f", strokeWidth: 1 }}
          contentStyle={{ background: "#0b1220", border: "1px solid #25395f", borderRadius: 4, color: "#e6edf6", fontSize: 12 }}
          formatter={(v: any) => (typeof v === "number" ? v.toFixed(3) : v)}
        />
        <ReferenceArea y1={0.66} y2={1} fill="#ff557715" />
        <ReferenceArea y1={0.33} y2={0.66} fill="#f7b95615" />
        <ReferenceArea y1={0} y2={0.33} fill="#2ee79b10" />
        <ReferenceLine y={0.5} stroke="#25395f" strokeDasharray="3 3" />
        {peakMonth && (
          <ReferenceLine
            x={peakMonth}
            stroke="#ff5577"
            strokeDasharray="2 4"
            label={{ value: "peak", fill: "#ff5577", fontSize: 10, position: "top" }}
          />
        )}
        <Area type="monotone" dataKey={yKey} stroke="none" fill="url(#riskFill)" />
        <Line type="monotone" dataKey={yKey} stroke="#4ddfff" strokeWidth={1.6} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
