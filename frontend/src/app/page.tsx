"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { FleetTable } from "@/components/fleet-table";
import { KpiCard } from "@/components/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, FleetRiskItem, MetricsSummary } from "@/lib/api";

export default function DashboardPage() {
  const [fleet, setFleet] = useState<FleetRiskItem[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.fleetRisk(), api.metrics()])
      .then(([f, m]) => {
        setFleet(f);
        setMetrics(m);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const highRisk = fleet.filter((a) => a.calibrated_risk >= 0.75).length;
  const savings = highRisk * 3 * 24 * 15000;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#0F62FE]/20 to-[#38BDF8]/10 p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-[#38BDF8]">Vue flotte</p>
        <h2 className="mt-2 text-3xl font-semibold">Surveillance corrosion en temps réel</h2>
        <p className="mt-2 max-w-2xl text-slate-400">
          Priorisez les C-checks et anticipez les pièces structurelles grâce aux probabilités calibrées.
        </p>
      </section>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-3 text-[#F59E0B]">
          <AlertTriangle className="h-5 w-5" />
          <span>API hors ligne — lancez <code className="font-mono">make api</code> après un entraînement.</span>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <KpiCard title="Flotte surveillée" value={String(fleet.length)} hint="aéronefs test" />
            <KpiCard
              title="Risque élevé"
              value={String(highRisk)}
              hint="probabilité ≥ 75 %"
              accent="text-[#EF4444]"
            />
            <KpiCard
              title="Brier OOF"
              value={metrics?.brier?.toFixed(4) ?? "—"}
              hint={metrics?.active_run_id ? `run ${metrics.active_run_id.slice(0, 16)}…` : "aucun modèle"}
              accent="text-[#38BDF8]"
            />
            <KpiCard
              title="Économies projetées"
              value={`$${(savings / 1e6).toFixed(1)}M`}
              hint="scénario conservateur AOG"
              accent="text-[#22C55E]"
            />
          </>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-medium text-slate-200">Registre flotte</h3>
        {loading ? <Skeleton className="h-96 rounded-2xl" /> : <FleetTable rows={fleet} />}
      </section>
    </div>
  );
}
