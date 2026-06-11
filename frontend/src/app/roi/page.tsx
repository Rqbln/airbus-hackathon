"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator, PiggyBank, TimerOff, Wrench } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, type ROIResult } from "@/lib/api";
import { formatUSD } from "@/lib/risk";
import { KpiCard } from "@/components/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";

interface Assumption {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: number;
}

const INITIAL: Assumption[] = [
  { key: "fleet_size", label: "Taille de flotte", min: 10, max: 500, step: 10, unit: "avions", value: 142 },
  { key: "avg_downtime_cost_per_hour", label: "Coût AOG horaire", min: 1000, max: 50000, step: 1000, unit: "$ / h", value: 15000 },
  { key: "ccheck_extension_days", label: "Jours d'immobilisation évités", min: 0, max: 10, step: 1, unit: "j / avion à risque", value: 3 },
  { key: "inspection_hours_saved_per_aircraft", label: "Heures d'inspection ciblée économisées", min: 0, max: 120, step: 5, unit: "h / avion", value: 40 },
  { key: "inspection_labor_rate", label: "Taux horaire MRO", min: 50, max: 300, step: 10, unit: "$ / h", value: 120 },
  { key: "software_implementation_cost", label: "Coût de mise en œuvre", min: 50000, max: 2000000, step: 50000, unit: "$", value: 250000 },
];

export default function ROIPage() {
  const [assumptions, setAssumptions] = useState(INITIAL);
  const [result, setResult] = useState<ROIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback((values: Assumption[]) => {
    const body = Object.fromEntries(values.map((a) => [a.key, a.value]));
    api
      .simulateROI(body as never)
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    simulate(assumptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: string, value: number) => {
    const next = assumptions.map((a) => (a.key === key ? { ...a, value } : a));
    setAssumptions(next);
    simulate(next);
  };

  const chartData = result
    ? [
        { poste: "AOG évité", montant: result.downtime_savings_usd },
        { poste: "Inspections ciblées", montant: result.inspection_savings_usd },
        {
          poste: "Coût logiciel",
          montant: -result.assumptions.software_implementation_cost,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Calculator className="h-6 w-6 text-[#22C55E]" /> Simulateur ROI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Traduction du risque prédit en impact financier MRO. Le nombre
          d&apos;avions à risque élevé provient du modèle actif.
        </p>
      </div>

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="p-4 text-sm text-red-400">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {result ? (
          <>
            <KpiCard
              label="Avions à risque élevé"
              value={String(result.high_risk_aircraft)}
              sub="probabilité ≥ 75 % (modèle actif)"
              icon={Wrench}
              accent="#EF4444"
            />
            <KpiCard
              label="Heures AOG évitées"
              value={result.avoided_downtime_hours.toLocaleString("fr-FR")}
              sub="maintenance planifiée vs subie"
              icon={TimerOff}
              accent="#F59E0B"
            />
            <KpiCard
              label="Économies totales"
              value={formatUSD(result.total_savings_usd)}
              sub="AOG + inspections ciblées"
              icon={PiggyBank}
              accent="#22C55E"
            />
            <KpiCard
              label="ROI"
              value={`${result.roi_percentage.toLocaleString("fr-FR")} %`}
              sub="vs coût de mise en œuvre"
              icon={Calculator}
              accent="#38BDF8"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hypothèses</CardTitle>
            <CardDescription>
              Ajuster les curseurs — le calcul se met à jour en direct.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {assumptions.map((a) => (
              <div key={a.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label>{a.label}</Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {a.value.toLocaleString("fr-FR")} {a.unit}
                  </span>
                </div>
                <Slider
                  min={a.min}
                  max={a.max}
                  step={a.step}
                  value={[a.value]}
                  onValueChange={([v]) => update(a.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impact financier annuel</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {result ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="poste" tick={{ fill: "#64748B", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    tickFormatter={(v: number) => `${(v / 1e6).toFixed(0)} M$`}
                  />
                  <Tooltip
                    formatter={(v) => formatUSD(Number(v))}
                    contentStyle={{
                      backgroundColor: "#0B2138",
                      border: "1px solid rgba(148,163,184,0.2)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="montant"
                    radius={[4, 4, 0, 0]}
                    fill="#22C55E"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
