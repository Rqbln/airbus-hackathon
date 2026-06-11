"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Droplets, Waves, Factory, Timer } from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
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

  if (error) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="p-6 text-sm">{error}</CardContent>
      </Card>
    );
  }

  const latest = data?.timeline.at(-1);
  const chartData =
    data?.timeline.map((m) => ({
      mois: m.year_month,
      risque: m.risk !== null ? +(m.risk * 100).toFixed(1) : null,
      cei: m.cei_cum,
    })) ?? [];

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
            Jumeau numérique — exposition environnementale et risque prédit.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data && latest ? (
          <>
            <KpiCard
              label="Risque actuel"
              value={formatPercent(data.latest_risk)}
              sub={`au ${latest.year_month}`}
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
          <CardTitle>Dose de corrosivité cumulée (CEI) vs risque prédit</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          {data ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis
                  dataKey="mois"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  minTickGap={40}
                />
                <YAxis
                  yAxisId="risk"
                  domain={[0, 100]}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  label={{
                    value: "Risque (%)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#64748B",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  yAxisId="cei"
                  orientation="right"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  tickFormatter={(v: number) => v.toExponential(0)}
                  label={{
                    value: "CEI cumulé",
                    angle: 90,
                    position: "insideRight",
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
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  yAxisId="cei"
                  type="monotone"
                  dataKey="cei"
                  name="CEI cumulé (ISO 9223)"
                  stroke="#38BDF8"
                  fill="rgba(56,189,248,0.12)"
                  strokeWidth={1.5}
                />
                <Line
                  yAxisId="risk"
                  type="monotone"
                  dataKey="risque"
                  name="Risque calibré (%)"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
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
          Le CEI (corrosivity increment, forme dose-réponse ISO 9223) intègre
          mois après mois le produit temps de parking × mouillage de la peau ×
          agressivité chimique (chlorure, SO₂). Le risque calibré suit cette
          dose accumulée : plus la pente du CEI est forte, plus l&apos;aéronef se
          rapproche du seuil critique.
        </CardContent>
      </Card>
    </div>
  );
}
