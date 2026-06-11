"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { api, ROIResponse } from "@/lib/api";

export default function RoiPage() {
  const [fleetSize, setFleetSize] = useState(142);
  const [costPerHour, setCostPerHour] = useState(15000);
  const [extensionDays, setExtensionDays] = useState(3);
  const [highRisk, setHighRisk] = useState(10);
  const [implCost, setImplCost] = useState(250000);
  const [result, setResult] = useState<ROIResponse | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .simulateRoi({
          fleet_size: fleetSize,
          avg_downtime_cost_per_hour: costPerHour,
          ccheck_extension_days: extensionDays,
          high_risk_aircraft_count: highRisk,
          inspection_labor_rate: 120,
          software_implementation_cost: implCost,
        })
        .then(setResult)
        .catch(() => setResult(null));
    }, 300);
    return () => clearTimeout(t);
  }, [fleetSize, costPerHour, extensionDays, highRisk, implCost]);

  const chartData = result
    ? [
        { name: "Économies", value: result.annual_savings_usd },
        { name: "Coût logiciel", value: -implCost },
        { name: "Net", value: result.annual_savings_usd - implCost },
      ]
    : [];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#22C55E]/15 to-[#0F62FE]/10 p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-[#22C55E]">Impact MRO</p>
        <h2 className="mt-2 text-3xl font-semibold">Simulateur ROI</h2>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-white/10 bg-white/5 text-slate-100">
          <CardHeader><CardTitle>Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Taille flotte : {fleetSize}</Label>
              <Slider value={[fleetSize]} min={50} max={300} step={1} onValueChange={(v) => setFleetSize(Array.isArray(v) ? v[0] : v)} />
            </div>
            <div>
              <Label>Coût AOG ($/h) : {costPerHour.toLocaleString()}</Label>
              <Slider value={[costPerHour]} min={5000} max={30000} step={500} onValueChange={(v) => setCostPerHour(Array.isArray(v) ? v[0] : v)} />
            </div>
            <div>
              <Label>Jours évités / avion : {extensionDays}</Label>
              <Slider value={[extensionDays]} min={1} max={10} step={1} onValueChange={(v) => setExtensionDays(Array.isArray(v) ? v[0] : v)} />
            </div>
            <div>
              <Label>Avions haut risque : {highRisk}</Label>
              <Slider value={[highRisk]} min={1} max={50} step={1} onValueChange={(v) => setHighRisk(Array.isArray(v) ? v[0] : v)} />
            </div>
            <div>
              <Label>Coût implémentation ($) : {implCost.toLocaleString()}</Label>
              <Slider value={[implCost]} min={50000} max={1000000} step={10000} onValueChange={(v) => setImplCost(Array.isArray(v) ? v[0] : v)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <KpiCard
              title="Économies annuelles"
              value={result ? `$${(result.annual_savings_usd / 1e6).toFixed(2)}M` : "—"}
              accent="text-[#22C55E]"
            />
            <KpiCard title="ROI" value={result ? `${result.roi_percentage.toFixed(0)}%` : "—"} accent="text-[#0F62FE]" />
            <KpiCard title="Heures évitées" value={result ? String(result.avoided_downtime_hours) : "—"} />
            <KpiCard title="Payback" value={result ? `${result.payback_months} mois` : "—"} />
          </div>
          <Card className="rounded-2xl border-white/10 bg-white/5 text-slate-100">
            <CardHeader><CardTitle>Impact financier</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8" }} />
                  <YAxis tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#071A2C", border: "1px solid #ffffff20" }} />
                  <Bar dataKey="value" fill="#0F62FE" radius={6} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
