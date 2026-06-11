"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, CompareResponse, RunStatus } from "@/lib/api";

function fmt(v: unknown, digits = 4) {
  return typeof v === "number" ? v.toFixed(digits) : "—";
}

export default function LaboPage() {
  const [runs, setRuns] = useState<RunStatus[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState<string | null>(null);

  const [model, setModel] = useState("histgb");
  const [calibration, setCalibration] = useState("sigmoid");
  const [featureSet, setFeatureSet] = useState("full");

  const refresh = useCallback(() => {
    return api.listRuns().then((r) => {
      setRuns(r);
      if (!selected && r.length) setSelected(r[0].run_id);
    });
  }, [selected]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(async () => {
      const run = await api.getRun(polling);
      if (run.status === "done" || run.status === "failed") {
        setPolling(null);
        await refresh();
        toast.success(run.status === "done" ? "Benchmark terminé" : "Benchmark échoué");
      }
    }, 2000);
    return () => clearInterval(id);
  }, [polling, refresh]);

  const startRun = async () => {
    const run = await api.startRun({
      model_name: model,
      calibration,
      feature_set: featureSet,
      n_splits: 5,
      tune: false,
    });
    setPolling(run.run_id);
    toast.message("Entraînement lancé");
    await refresh();
  };

  const detail = runs.find((r) => r.run_id === selected);
  const m = detail?.metrics ?? {};
  const foldBrier = (m.fold_brier as number[]) ?? [];
  const calib = (m.calibration_curve as Array<{ mean_pred: number | null; frac_pos: number | null; bin: number }>) ?? [];
  const importance = (m.feature_importance as Array<{ feature: string; gain: number | null; permutation: number | null }>) ?? [];

  const loadCompare = async () => {
    if (!compareA || !compareB) return;
    setCompare(await api.compareRuns(compareA, compareB));
  };

  const bestBrier = runs
    .filter((r) => r.status === "done" && typeof r.metrics?.brier === "number")
    .sort((a, b) => (a.metrics!.brier as number) - (b.metrics!.brier as number))[0];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#C026D3]/20 to-[#0F62FE]/10 p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-[#C026D3]">Labo ML</p>
        <h2 className="mt-2 text-3xl font-semibold">Benchmark & itération modèle</h2>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-white/10 bg-white/5 text-slate-100 lg:col-span-1">
          <CardHeader>
            <CardTitle>Nouveau run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modèle</Label>
              <Select value={model} onValueChange={(v) => v && setModel(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="histgb">HistGradientBoosting</SelectItem>
                  <SelectItem value="lightgbm">LightGBM</SelectItem>
                  <SelectItem value="logreg">Régression logistique</SelectItem>
                  <SelectItem value="constant">Constante 0.5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Calibration</Label>
              <Select value={calibration} onValueChange={(v) => v && setCalibration(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sigmoid">Platt (sigmoid)</SelectItem>
                  <SelectItem value="isotonic">Isotonic</SelectItem>
                  <SelectItem value="none">Aucune</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jeu de features</Label>
              <Select value={featureSet} onValueChange={(v) => v && setFeatureSet(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Complet</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="cei_only">CEI uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-[#0F62FE] hover:bg-[#0F62FE]/90" onClick={startRun} disabled={!!polling}>
              Lancer le benchmark
            </Button>
            {polling ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Entraînement en cours…</p>
                <Progress value={66} className="h-2" />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard title="Meilleur Brier" value={fmt(bestBrier?.metrics?.brier)} accent="text-[#22C55E]" />
            <KpiCard title="Δ vs baseline" value={fmt(bestBrier?.metrics?.delta_vs_baseline_025)} accent="text-[#38BDF8]" />
            <KpiCard title="ECE" value={fmt(bestBrier?.metrics?.ece)} />
            <KpiCard title="AUC" value={fmt(bestBrier?.metrics?.roc_auc, 3)} />
          </div>

          {loading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400">Run</TableHead>
                    <TableHead className="text-slate-400">Statut</TableHead>
                    <TableHead className="text-slate-400">Brier</TableHead>
                    <TableHead className="text-slate-400">AUC</TableHead>
                    <TableHead className="text-slate-400">ECE</TableHead>
                    <TableHead className="text-slate-400">Durée</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow
                      key={r.run_id}
                      className={`border-white/10 cursor-pointer ${selected === r.run_id ? "bg-[#0F62FE]/20" : ""}`}
                      onClick={() => setSelected(r.run_id)}
                    >
                      <TableCell className="font-mono text-xs">{r.run_id}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell>{fmt(r.metrics?.brier)}</TableCell>
                      <TableCell>{fmt(r.metrics?.roc_auc, 3)}</TableCell>
                      <TableCell>{fmt(r.metrics?.ece)}</TableCell>
                      <TableCell>
                        {typeof r.metrics?.duration_seconds === "number"
                          ? `${r.metrics.duration_seconds}s`
                          : "—"}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            api.activateRun(r.run_id).then(() => toast.success("Modèle actif mis à jour"));
                          }}
                        >
                          Activer
                        </Button>
                        <a
                          href={api.submissionUrl(r.run_id)}
                          className="inline-flex h-8 items-center rounded-lg bg-secondary px-3 text-xs font-medium text-secondary-foreground"
                        >
                          CSV
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {detail ? (
        <Tabs defaultValue="metrics">
          <TabsList className="bg-white/5">
            <TabsTrigger value="metrics">Métriques</TabsTrigger>
            <TabsTrigger value="calibration">Calibration</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="compare">Comparer</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="mt-4 grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl border-white/10 bg-white/5 text-slate-100">
              <CardHeader><CardTitle>Brier par fold</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={foldBrier.map((v, i) => ({ fold: i + 1, brier: v }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                    <XAxis dataKey="fold" tick={{ fill: "#94a3b8" }} />
                    <YAxis tick={{ fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ background: "#071A2C", border: "1px solid #ffffff20" }} />
                    <Bar dataKey="brier" fill="#0F62FE" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-white/10 bg-white/5 text-slate-100">
              <CardHeader><CardTitle>Décomposition Brier</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <p>Reliability : {fmt((m.brier_decomposition as { reliability?: number })?.reliability)}</p>
                <p>Resolution : {fmt((m.brier_decomposition as { resolution?: number })?.resolution)}</p>
                <p>Uncertainty : {fmt((m.brier_decomposition as { uncertainty?: number })?.uncertainty)}</p>
                <p>Log-loss : {fmt(m.log_loss)}</p>
                <p>Δ vs meilleur run : {fmt(m.delta_vs_best_run)}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calibration" className="mt-4">
            <Card className="rounded-2xl border-white/10 bg-white/5 text-slate-100">
              <CardHeader><CardTitle>Courbe de calibration</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calib.filter((c) => c.mean_pred != null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                    <XAxis dataKey="mean_pred" tick={{ fill: "#94a3b8" }} />
                    <YAxis domain={[0, 1]} tick={{ fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ background: "#071A2C", border: "1px solid #ffffff20" }} />
                    <Line type="monotone" dataKey="frac_pos" name="Fréquence réelle" stroke="#22C55E" />
                    <Line type="monotone" dataKey="mean_pred" name="Prédiction moyenne" stroke="#38BDF8" strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-slate-400">Feature</TableHead>
                    <TableHead className="text-slate-400">Gain</TableHead>
                    <TableHead className="text-slate-400">Permutation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importance.slice(0, 15).map((f) => (
                    <TableRow key={f.feature} className="border-white/10">
                      <TableCell className="font-mono text-xs">{f.feature}</TableCell>
                      <TableCell>{f.gain != null ? f.gain.toExponential(2) : "—"}</TableCell>
                      <TableCell>{f.permutation != null ? f.permutation.toFixed(4) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              <Select value={compareA} onValueChange={(v) => v && setCompareA(v)}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Run A" /></SelectTrigger>
                <SelectContent>
                  {runs.map((r) => (
                    <SelectItem key={r.run_id} value={r.run_id}>{r.run_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={compareB} onValueChange={(v) => v && setCompareB(v)}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Run B" /></SelectTrigger>
                <SelectContent>
                  {runs.map((r) => (
                    <SelectItem key={r.run_id} value={r.run_id}>{r.run_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={loadCompare} className="bg-[#0F62FE]">Comparer</Button>
            </div>
            {compare ? (
              <Card className="rounded-2xl border-white/10 bg-white/5 text-slate-100">
                <CardContent className="space-y-2 pt-6 text-sm">
                  {Object.entries(compare.metrics).map(([k, v]) => (
                    <p key={k}>
                      {k}: {fmt(v.a)} → {fmt(v.b)} (Δ {fmt(v.delta)})
                    </p>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
