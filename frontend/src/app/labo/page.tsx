"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FlaskConical,
  Loader2,
  Play,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  api,
  type LabOptions,
  type RunDetail,
  type RunListItem,
} from "@/lib/api";
import { KAGGLE_PUBLIC_BRIER, KAGGLE_REFERENCE_RUN_ID } from "@/lib/kaggle";
import { formatNumber } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#0B2138",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 8,
  fontSize: 12,
};

const MODEL_LABELS: Record<string, string> = {
  lightgbm: "LightGBM",
  histgb: "HistGradientBoosting",
  logreg: "Régression logistique",
  constant: "Constante (baseline)",
  ensemble: "Ensemble LGBM + HistGB",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "done")
    return (
      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Terminé
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400">
        <XCircle className="mr-1 h-3 w-3" /> Échec
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-400">
      <Loader2 className="mr-1 h-3 w-3 animate-spin" /> En cours
    </Badge>
  );
}

export default function LaboPage() {
  const [options, setOptions] = useState<LabOptions | null>(null);
  const [runs, setRuns] = useState<RunListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Formulaire
  const [model, setModel] = useState("lightgbm");
  const [featureSet, setFeatureSet] = useState("full");
  const [calibration, setCalibration] = useState("sigmoid");
  const [folds, setFolds] = useState(5);
  const [name, setName] = useState("");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    api
      .listRuns()
      .then((r) => {
        setRuns(r.runs);
        setSelected((prev) => prev ?? KAGGLE_REFERENCE_RUN_ID);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    api.labOptions().then((o) => {
      setOptions(o);
      if (!o.models.includes("lightgbm")) setModel(o.models[0]);
    }).catch((e: Error) => setError(e.message));
    refresh();
  }, [refresh]);

  // Polling tant qu'un run est en cours
  const hasActiveRun = runs?.some((r) => r.status === "pending" || r.status === "running");
  useEffect(() => {
    if (hasActiveRun) {
      pollingRef.current = setInterval(refresh, 2500);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [hasActiveRun, refresh]);

  useEffect(() => {
    if (selected) {
      api.runDetail(selected).then(setDetail).catch(() => setDetail(null));
    } else {
      setDetail(null);
    }
  }, [selected, runs]);

  const bestBrier = useMemo(() => {
    const briers = (runs ?? [])
      .filter((r) => r.status === "done" && r.summary.brier !== null)
      .map((r) => r.summary.brier as number);
    return briers.length ? Math.min(...briers) : null;
  }, [runs]);

  const launch = () => {
    setLaunching(true);
    api
      .createRun({
        name,
        model,
        feature_set: featureSet,
        calibration,
        n_splits: folds,
      })
      .then((r) => {
        setSelected(r.run_id);
        refresh();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLaunching(false));
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev.slice(-1), id]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FlaskConical className="h-6 w-6 text-[#C026D3]" /> Labo ML
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modèle final Kaggle : Brier{" "}
          <span className="font-mono tabular-nums">{KAGGLE_PUBLIC_BRIER}</span>{" "}
          (1&nbsp;% leaderboard public). Seuls les runs locaux avec un Brier
          strictement supérieur sont listés, plus cette référence. Objectif
          local : minimiser le Brier OOF (baseline 0.2500).
        </p>
      </div>

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="p-4 text-sm text-red-400">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Nouveau benchmark</CardTitle>
            <CardDescription>
              Chaque run est persisté et comparable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom (optionnel)</Label>
              <Input
                placeholder="ex. essai isotonique"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Modèle</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(options?.models ?? ["histgb"]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODEL_LABELS[m] ?? m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jeu de features</Label>
              <Select value={featureSet} onValueChange={setFeatureSet}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(options?.feature_sets ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Calibration</Label>
              <Select value={calibration} onValueChange={setCalibration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(options?.calibrations ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Folds de validation : {folds}</Label>
              <Slider
                min={3}
                max={10}
                step={1}
                value={[folds]}
                onValueChange={([v]) => setFolds(v)}
              />
            </div>
            <Button className="w-full" onClick={launch} disabled={launching}>
              {launching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Lancer le benchmark
            </Button>
          </CardContent>
        </Card>

        {/* Tableau des runs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Runs ({runs?.length ?? "…"})</CardTitle>
            <CardDescription>
              ★ = modèle de référence Kaggle (métriques dashboard). Cocher 2
              runs pour les comparer. Meilleur Brier affiché en vert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {runs ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Run</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Brier ↓</TableHead>
                    <TableHead>AUC</TableHead>
                    <TableHead>ECE</TableHead>
                    <TableHead>Δ baseline</TableHead>
                    <TableHead>Durée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow
                      key={r.run_id}
                      className={cn(
                        "cursor-pointer",
                        selected === r.run_id && "bg-primary/10"
                      )}
                      onClick={() => setSelected(r.run_id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="accent-[#0F62FE]"
                          checked={compareIds.includes(r.run_id)}
                          onChange={() => toggleCompare(r.run_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {r.is_active && (
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          )}
                          <div>
                            <p className="text-xs font-medium">
                              {r.config?.name || MODEL_LABELS[r.config?.model] || r.config?.model}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {r.config?.model} · {r.config?.feature_set} ·{" "}
                              {r.config?.calibration} · cv{r.config?.n_splits}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell
                        className={cn(
                          "font-mono tabular-nums",
                          r.summary.brier !== null &&
                            r.summary.brier === bestBrier &&
                            "font-semibold text-emerald-400"
                        )}
                      >
                        {formatNumber(r.summary.brier)}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {formatNumber(r.summary.auc, 3)}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {formatNumber(r.summary.ece, 3)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "font-mono tabular-nums",
                          (r.summary.delta_vs_baseline ?? 0) < 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        )}
                      >
                        {r.summary.delta_vs_baseline !== null
                          ? formatNumber(r.summary.delta_vs_baseline)
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {r.summary.duration_seconds
                          ? `${Math.round(r.summary.duration_seconds)} s`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparaison côte à côte */}
      {compareIds.length === 2 && (
        <CompareCard a={compareIds[0]} b={compareIds[1]} />
      )}

      {/* Détail du run sélectionné */}
      {detail && detail.metrics && (
        <RunDetailCard detail={detail} onChanged={refresh} />
      )}
    </div>
  );
}

function MetricRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{label}</TableCell>
      <TableCell className="font-mono tabular-nums">{a}</TableCell>
      <TableCell className="font-mono tabular-nums">{b}</TableCell>
    </TableRow>
  );
}

function CompareCard({ a, b }: { a: string; b: string }) {
  const [runA, setRunA] = useState<RunDetail | null>(null);
  const [runB, setRunB] = useState<RunDetail | null>(null);

  useEffect(() => {
    api.runDetail(a).then(setRunA).catch(() => setRunA(null));
    api.runDetail(b).then(setRunB).catch(() => setRunB(null));
  }, [a, b]);

  if (!runA?.metrics || !runB?.metrics) return null;
  const ma = runA.metrics;
  const mb = runB.metrics;

  return (
    <Card className="border-[#C026D3]/30">
      <CardHeader>
        <CardTitle>Comparaison côte à côte</CardTitle>
        <CardDescription className="font-mono text-xs">
          A = {runA.run_id} · B = {runB.run_id}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Métrique</TableHead>
              <TableHead>A</TableHead>
              <TableHead>B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <MetricRow
              label="Configuration"
              a={`${runA.config.model} · ${runA.config.feature_set} · ${runA.config.calibration} · cv${runA.config.n_splits}`}
              b={`${runB.config.model} · ${runB.config.feature_set} · ${runB.config.calibration} · cv${runB.config.n_splits}`}
            />
            <MetricRow label="Brier (calibré)" a={formatNumber(ma.brier)} b={formatNumber(mb.brier)} />
            <MetricRow label="Brier (brut)" a={formatNumber(ma.brier_uncalibrated)} b={formatNumber(mb.brier_uncalibrated)} />
            <MetricRow label="Log-loss" a={formatNumber(ma.log_loss)} b={formatNumber(mb.log_loss)} />
            <MetricRow label="ROC-AUC" a={formatNumber(ma.auc, 3)} b={formatNumber(mb.auc, 3)} />
            <MetricRow label="ECE" a={formatNumber(ma.ece, 3)} b={formatNumber(mb.ece, 3)} />
            <MetricRow
              label="Brier par fold (μ ± σ)"
              a={`${formatNumber(ma.brier_per_fold_mean)} ± ${formatNumber(ma.brier_per_fold_std)}`}
              b={`${formatNumber(mb.brier_per_fold_mean)} ± ${formatNumber(mb.brier_per_fold_std)}`}
            />
            <MetricRow label="Nb features" a={String(ma.n_features)} b={String(mb.n_features)} />
            <MetricRow
              label="Durée"
              a={`${Math.round(ma.duration_seconds)} s`}
              b={`${Math.round(mb.duration_seconds)} s`}
            />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RunDetailCard({
  detail,
  onChanged,
}: {
  detail: RunDetail;
  onChanged: () => void;
}) {
  const m = detail.metrics!;
  const isKaggleRef = detail.run_id === KAGGLE_REFERENCE_RUN_ID;

  const calibData = m.calibration_curve
    .filter((b) => b.p_moyen !== null)
    .map((b) => ({
      p: +(b.p_moyen! * 100).toFixed(1),
      observe: +(b.freq_observee! * 100).toFixed(1),
      ideal: +(b.p_moyen! * 100).toFixed(1),
      effectif: b.effectif,
    }));

  const histData = m.prediction_histogram.map((h) => ({
    bin: `${(h.bin_min * 100).toFixed(0)}`,
    Sains: h.sains,
    Corrodés: h.corrodes,
  }));

  const foldData = m.brier_per_fold.map((b, i) => ({
    fold: `F${i + 1}`,
    brier: +b.toFixed(4),
  }));

  const permData = m.permutation_importance.slice(0, 15).map((f) => ({
    feature: f.feature,
    importance: +f.importance.toFixed(5),
  }));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-mono text-base">{detail.run_id}</CardTitle>
          <CardDescription>
            {detail.config.name || "—"} · {detail.config.notes || "sans note"}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {!isKaggleRef && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={detail.status !== "done" || detail.is_active}
                onClick={() =>
                  api.activateRun(detail.run_id).then(onChanged)
                }
              >
                <Star className="h-4 w-4" /> Définir comme modèle actif
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={api.submissionUrl(detail.run_id)}
                  download
                  onClick={(e) => {
                    e.preventDefault();
                    fetch(api.submissionUrl(detail.run_id), { method: "POST" })
                      .then((r) => r.blob())
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `submission_${detail.run_id}.csv`;
                        link.click();
                        URL.revokeObjectURL(url);
                      });
                  }}
                >
                  <Download className="h-4 w-4" /> Soumission Kaggle
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
                onClick={() => api.deleteRun(detail.run_id).then(onChanged)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {isKaggleRef && (
            <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-400">
              Référence Kaggle — ml/final_model.ipynb
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grille de métriques */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Brier", value: formatNumber(m.brier), hint: "calibré (objectif)" },
            { label: "Brier brut", value: formatNumber(m.brier_uncalibrated), hint: "avant calibration" },
            { label: "Log-loss", value: formatNumber(m.log_loss), hint: "" },
            { label: "ROC-AUC", value: formatNumber(m.auc, 3), hint: "discrimination" },
            { label: "ECE", value: formatNumber(m.ece, 3), hint: "erreur de calibration" },
            {
              label: "Fiabilité / Résolution",
              value: `${formatNumber(m.brier_decomposition.reliability, 4)} / ${formatNumber(m.brier_decomposition.resolution, 4)}`,
              hint: "décomposition du Brier",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </p>
              <p className="mt-1 font-mono text-lg tabular-nums">{kpi.value}</p>
              {kpi.hint && (
                <p className="text-[10px] text-muted-foreground">{kpi.hint}</p>
              )}
            </div>
          ))}
        </div>

        <Tabs defaultValue="calibration">
          <TabsList>
            <TabsTrigger value="calibration">Calibration</TabsTrigger>
            <TabsTrigger value="histogram">Distribution</TabsTrigger>
            <TabsTrigger value="folds">Stabilité (folds)</TabsTrigger>
            <TabsTrigger value="features">Top features</TabsTrigger>
          </TabsList>

          <TabsContent value="calibration" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={calibData}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" />
                <XAxis
                  dataKey="p"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  label={{ value: "Probabilité prédite (%)", position: "insideBottom", offset: -2, fill: "#64748B", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  label={{ value: "Fréquence observée (%)", angle: -90, position: "insideLeft", fill: "#64748B", fontSize: 11 }}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="ideal" name="Calibration parfaite" stroke="#64748B" strokeDasharray="4 4" dot={false} />
                <Line dataKey="observe" name="Modèle" stroke="#38BDF8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="histogram" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histData}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="bin" tick={{ fill: "#64748B", fontSize: 11 }}
                  label={{ value: "Probabilité prédite (%)", position: "insideBottom", offset: -2, fill: "#64748B", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Sains" stackId="a" fill="#22C55E" />
                <Bar dataKey="Corrodés" stackId="a" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="folds" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={foldData}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="fold" tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis domain={[0, 0.3]} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <ReferenceLine
                  y={KAGGLE_PUBLIC_BRIER}
                  stroke="#22C55E"
                  strokeDasharray="4 4"
                  label={{
                    value: `Kaggle ${KAGGLE_PUBLIC_BRIER}`,
                    fill: "#22C55E",
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  y={0.25}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  label={{ value: "baseline 0.25", fill: "#EF4444", fontSize: 11 }}
                />
                <Bar dataKey="brier" name="Brier du fold" fill="#0F62FE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="features" className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={permData} layout="vertical" margin={{ left: 140 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="feature"
                  width={140}
                  tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "monospace" }}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="importance" name="Permutation (Brier)" fill="#C026D3" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
