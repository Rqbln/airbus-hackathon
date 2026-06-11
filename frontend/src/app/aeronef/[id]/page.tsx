"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Droplets, Waves, Factory, Timer } from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { api, type AircraftDetail } from "@/lib/api";
import { formatPercent } from "@/lib/risk";
import { KpiCard } from "@/components/kpi-card";
import { RiskBadge } from "@/components/risk-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AircraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<AircraftDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .aircraft(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const chartData = useMemo(
    () =>
      data?.timeline.map((m) => ({
        mois: m.year_month,
        risque: m.risk_smooth !== null ? +(m.risk_smooth * 100).toFixed(1) : null,
        cei: m.cei_index !== null ? +m.cei_index.toFixed(1) : null,
      })) ?? [],
    [data]
  );

  if (error) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="p-6 text-sm">{error}</CardContent>
      </Card>
    );
  }

  const latest = data?.timeline.at(-1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Flotte
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <span className="font-mono">{id}</span>
            {data && <RiskBadge tier={data.tier} />}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jumeau numérique — exposition environnementale et risque prédit (lissé
            6 mois).
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data && latest ? (
          <>
            <KpiCard
              label="Risque actuel"
              value={formatPercent(data.latest_risk)}
              sub={`au ${latest.year_month} (moy. glissante)`}
              accent="#EF4444"
            />
            <KpiCard
              label="Humidité moyenne"
              value={latest.humidity !== null ? `${latest.humidity.toFixed(0)} %` : "—"}
              sub="dernier mois"
              icon={Droplets}
              accent="#38BDF8"
            />
            <KpiCard
              label="Sel marin"
              value={latest.chloride !== null ? latest.chloride.toExponential(1) : "—"}
              sub="mixing ratio chlorure"
              icon={Waves}
              accent="#C026D3"
            />
            <KpiCard
              label="Parking"
              value={
                latest.parking_hours !== null
                  ? `${Math.round(latest.parking_hours)} h`
                  : "—"
              }
              sub="dernier mois"
              icon={Timer}
              accent="#F59E0B"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Indice d&apos;exposition (CEI) vs risque prédit</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          {data ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis
                  dataKey="mois"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  minTickGap={48}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  label={{
                    value: "Indice (0–100)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#64748B",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0B2138",
                    border: "1px solid rgba(148,163,184,0.2)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    value != null ? `${value} %` : "—",
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="linear"
                  dataKey="cei"
                  name="Indice CEI cumulé"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="risque"
                  name="Risque lissé (6 mois)"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-muted-foreground" />
            Lecture
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Les deux courbes sont sur la même échelle 0–100 : l&apos;indice CEI
          cumulé (dose d&apos;exposition normalisée) et le risque lissé sur 6 mois
          pour une lecture stable dans le temps. Le CEI intègre parking ×
          mouillage × agressivité chimique (chlorure, SO₂).
        </CardContent>
      </Card>
    </div>
  );
}
