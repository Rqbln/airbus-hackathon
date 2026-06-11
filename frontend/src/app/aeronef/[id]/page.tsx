"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, TimelinePoint } from "@/lib/api";

export default function AircraftPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    api
      .aircraft(params.id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [params.id]);

  const latest = data[data.length - 1];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm uppercase tracking-[0.25em] text-[#C026D3]">Jumeau numérique</p>
        <h2 className="mt-2 font-mono text-3xl font-semibold">{params.id}</h2>
      </section>

      {loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Risque actuel"
              value={`${((latest?.risk ?? 0) * 100).toFixed(1)}%`}
              accent="text-[#0F62FE]"
            />
            <KpiCard title="CEI mensuel" value={(latest?.cei ?? 0).toExponential(2)} />
            <KpiCard title="CEI cumulé" value={(latest?.cum_cei ?? 0).toExponential(2)} />
          </div>

          <div className="h-[420px] rounded-2xl border border-white/10 bg-white/5 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis dataKey="year_month" tick={{ fill: "#94a3b8", fontSize: 11 }} minTickGap={24} />
                <YAxis yAxisId="left" tick={{ fill: "#38BDF8" }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fill: "#EF4444" }} />
                <Tooltip
                  contentStyle={{ background: "#071A2C", border: "1px solid #ffffff20" }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="cei" name="CEI" stroke="#38BDF8" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="risk" name="Risque" stroke="#EF4444" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
