import { Badge } from "@/components/ui/Badge";
import { Panel, PanelBody, PanelHeader, Section } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Stat } from "@/components/ui/Stat";
import { BarComparison } from "@/components/charts/BarComparison";
import { Histogram } from "@/components/charts/Histogram";
import { StackedRiskBar } from "@/components/charts/StackedRiskBar";
import { IconAlert, IconShield, IconFlask, IconTrendDown, IconCheck } from "@/components/ui/Icons";
import { readCsv, readJson } from "@/lib/data";
import { getScores, pct } from "@/lib/scores";
import { buildFleetSummary, fleetTotals } from "@/lib/aircraft";

type DatasetSummary = {
  n_train_aircraft_env: number;
  n_train_aircraft_corr: number;
  n_test_aircraft: number;
  n_train_env_rows: number;
  n_test_env_rows: number;
  n_submission_rows: number;
  n_raw_features: number;
  period_train: { min: string; max: string };
  period_test: { min: string; max: string };
};

type FeatureImportanceRow = { feature: string; importance: number };

// Map raw feature names to a "driver category" displayed in the "Why risk increases" section.
function classifyDriver(feature: string): string | null {
  const f = feature.toLowerCase();
  if (f.includes("parking")) return "Parking time";
  if (f.includes("age_months") || f.includes("years_since_delivery")) return "Aircraft age";
  if (f.includes("humidity")) return "Humidity";
  if (f.includes("sea_salt") || f.includes("salt")) return "Sea-salt exposure";
  if (
    f.includes("so2") || f.includes("sulph") ||
    f.includes("ozone") || f.includes("hno3") ||
    f.includes("no2") || f.includes("no_") ||
    f.includes("black_carbon") || f.includes("dust")
  )
    return "Pollutants";
  if (f.includes("temperature") || f.includes("dew_point")) return "Temperature";
  return null;
}

export default function DashboardPage() {
  const ds = readJson<DatasetSummary>("dataset_summary.json");
  const scores = getScores();
  const dist = readCsv("prediction_distribution.csv").map((d) => ({
    bin_mid: parseFloat(d.bin_mid),
    count: parseInt(d.count, 10),
  }));
  const fi = readCsv("feature_importance.csv").map<FeatureImportanceRow>((d) => ({
    feature: d.feature,
    importance: parseFloat(d.importance),
  }));

  const fleet = buildFleetSummary();
  const totals = fleetTotals(fleet);

  // Aggregate feature importance into driver categories.
  const driverMap = new Map<string, number>();
  fi.forEach((r) => {
    const c = classifyDriver(r.feature);
    if (!c) return;
    driverMap.set(c, (driverMap.get(c) || 0) + r.importance);
  });
  const drivers = Array.from(driverMap.entries())
    .map(([category, importance]) => ({ category, importance }))
    .sort((a, b) => b.importance - a.importance);
  const driversTotal = drivers.reduce((a, b) => a + b.importance, 0) || 1;

  // Model progression bars.
  const COLOR = {
    baseline: "#5a6477",
    fe: "#00b4d8",
    robust: "#2ee79b",
    experimental: "#b97aff",
  };
  const compareRows: { name: string; brier: number; color: string; tag: string }[] = [];
  if (scores.baseline) {
    compareRows.push({ name: "Baseline · LightGBM (raw)", brier: scores.baseline.brier, color: COLOR.baseline, tag: "v0" });
  }
  scores.models
    .filter((m) => m.name !== scores.robust?.model)
    .forEach((m) =>
      compareRows.push({ name: `FE · ${m.name}`, brier: m.brier, color: COLOR.fe, tag: "fe" })
    );
  if (scores.robust) {
    compareRows.push({
      name: `Robust · ${scores.robust.model} + ${scores.robust.calibration}`,
      brier: scores.robust.brier,
      color: COLOR.robust,
      tag: "robust",
    });
  }
  if (scores.experimental) {
    compareRows.push({
      name: "Experimental · ensemble + isotonic",
      brier: scores.experimental.brier,
      color: COLOR.experimental,
      tag: "experimental",
    });
  }

  return (
    <div className="space-y-10">
      {/* === Header === */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="info" dot>
            Live · Fleet ops
          </Badge>
          <Badge variant="muted">HAKS 2026 · Airbus × IBM × AWS</Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Corrosion Risk Operations</h1>
          <p className="text-fg-dim mt-1.5 max-w-3xl">
            Monthly risk scoring for inspection prioritization across {ds?.n_test_aircraft ?? 142}{" "}
            in-service aircraft. Probabilities are evaluated with the{" "}
            <span className="text-fg font-mono">Brier score</span> — lower is safer; naïve 0.5 baseline = 0.25.
          </p>
        </div>
      </header>

      {/* === KPIs === */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Fleet under monitoring"
          value={ds ? ds.n_test_aircraft : 142}
          unit="aircraft"
          hint={ds ? `${ds.n_test_env_rows.toLocaleString()} monthly observations` : ""}
        />
        <Kpi
          label="Predictions issued"
          value={ds ? ds.n_submission_rows.toLocaleString() : "14,303"}
          hint="One probability per aircraft × month"
        />
        <Kpi
          label="Robust CV Brier"
          value={scores.robust ? scores.robust.brier.toFixed(4) : "—"}
          tone="good"
          right={<Badge variant="robust">Robust</Badge>}
          hint={
            scores.robust ? (
              <>
                <span className="text-fg-dim">{scores.robust.model}</span> + {scores.robust.calibration} ·{" "}
                <span className="text-risk-low">−{scores.robust ? pct(scores.robust.brier) : "—"}%</span> vs naïve
              </>
            ) : null
          }
        />
        <Kpi
          label="Experimental ensemble"
          value={scores.experimental ? scores.experimental.brier.toFixed(4) : "—"}
          tone="experimental"
          right={<Badge variant="experimental">Optimistic</Badge>}
          hint={
            scores.experimental ? (
              <>
                Isotonic refit on the same folds it evaluates · optimistic by design. Raw{" "}
                <span className="mono">{scores.experimental.brierUncalibrated.toFixed(4)}</span>.
              </>
            ) : null
          }
        />
      </section>

      {/* === Inspection Priority === */}
      <Section
        eyebrow="Operations"
        title="Inspection priority"
        description="Each test aircraft is ranked by its peak predicted risk and recent 12-month trend. URGENT items should be queued for ground inspection."
      >
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Kpi
              small
              label="Urgent"
              value={totals.urgent}
              tone="bad"
              hint="peak risk > 0.66 or recent trend > 0.55"
            />
            <Kpi
              small
              label="Watch"
              value={totals.watch}
              tone="warn"
              hint="schedule within 90 days"
            />
            <Kpi
              small
              label="Routine"
              value={totals.routine}
              tone="info"
              hint="standard cycle"
            />
            <Kpi
              small
              label="Clear"
              value={totals.clear}
              tone="good"
              hint="no anomaly"
            />
          </div>

          <Panel className="xl:col-span-2">
            <PanelHeader
              title="Fleet risk distribution by month-bucket"
              subtitle={`${totals.allMonths.toLocaleString()} aircraft-months across ${fleet.length} aircraft`}
              right={
                <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-fg-dim">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-risk-low/70" /> low</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-risk-mid/70" /> mid</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-risk-high/70" /> high</span>
                </div>
              }
            />
            <PanelBody>
              <div className="space-y-2">
                <StackedRiskBar low={totals.low} mid={totals.mid} high={totals.high} height={22} />
                <div className="flex justify-between text-xs text-fg-dim mt-1">
                  <span>
                    Low <span className="mono text-fg">{totals.low.toLocaleString()}</span>
                  </span>
                  <span>
                    Mid <span className="mono text-fg">{totals.mid.toLocaleString()}</span>
                  </span>
                  <span>
                    High <span className="mono text-risk-high">{totals.high.toLocaleString()}</span>
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <div className="text-2xs uppercase tracking-widest text-fg-faint mb-2">Prediction distribution</div>
                <Histogram data={dist} height={170} />
              </div>
            </PanelBody>
          </Panel>
        </div>

        <Panel>
          <PanelHeader
            title="Top aircraft by peak risk"
            subtitle="First 10 of the priority queue · click Aircraft Explorer for full detail"
            right={<Badge variant="info">{fleet.length} aircraft scored</Badge>}
          />
          <PanelBody pad={false}>
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead className="text-2xs uppercase tracking-widest text-fg-faint">
                  <tr className="border-b border-line">
                    <th className="text-left py-2.5 px-5">#</th>
                    <th className="text-left py-2.5 px-2">Aircraft</th>
                    <th className="text-left py-2.5 px-2">Priority</th>
                    <th className="text-right py-2.5 px-2">Peak risk</th>
                    <th className="text-left py-2.5 px-2">Peak month</th>
                    <th className="text-right py-2.5 px-2">Recent 12mo</th>
                    <th className="text-right py-2.5 px-2">High mo.</th>
                    <th className="text-right py-2.5 px-5">Months obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.slice(0, 10).map((s, i) => (
                    <tr key={s.aircraft_id} className="border-b border-line/40 hover:bg-ink-3/50 transition">
                      <td className="py-2.5 px-5 text-fg-faint mono">{(i + 1).toString().padStart(2, "0")}</td>
                      <td className="py-2.5 px-2 mono text-fg">{s.aircraft_id}</td>
                      <td className="py-2.5 px-2">
                        {s.priority === "URGENT" && <Badge variant="high">Urgent</Badge>}
                        {s.priority === "WATCH" && <Badge variant="mid">Watch</Badge>}
                        {s.priority === "ROUTINE" && <Badge variant="info">Routine</Badge>}
                        {s.priority === "CLEAR" && <Badge variant="low">Clear</Badge>}
                      </td>
                      <td className="py-2.5 px-2 text-right mono text-risk-high">{s.peak_risk.toFixed(3)}</td>
                      <td className="py-2.5 px-2 mono text-fg-dim">{s.peak_month}</td>
                      <td className="py-2.5 px-2 text-right mono">{s.recent12_mean.toFixed(3)}</td>
                      <td className="py-2.5 px-2 text-right mono">{s.high_months}</td>
                      <td className="py-2.5 px-5 text-right mono text-fg-dim">{s.n_months}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelBody>
        </Panel>
      </Section>

      {/* === Model progression === */}
      <Section
        eyebrow="Model progression"
        title="From baseline to ensemble"
        description="Each row is a 5-fold GroupKFold OOF Brier on the same 1,142-row strict training set. Lower is better; the green line is the score we trust on hold-out, purple is the optimistic experimental ensemble."
        right={
          <div className="flex items-center gap-2">
            <Badge variant="muted">Baseline</Badge>
            <Badge variant="info">FE</Badge>
            <Badge variant="robust">Robust</Badge>
            <Badge variant="experimental">Experimental</Badge>
          </div>
        }
      >
        <Panel>
          <PanelBody>
            {compareRows.length > 0 ? (
              <BarComparison data={compareRows} xKey="name" yKey="brier" colorKey="color" domain={[0, 0.25]} showValueLabel />
            ) : (
              <div className="text-sm text-fg-dim py-12 text-center">No metrics found.</div>
            )}
          </PanelBody>
        </Panel>
      </Section>

      {/* === Why risk increases === */}
      <Section
        eyebrow="Risk drivers"
        title="Why risk increases"
        description="Aggregated CatBoost gain over the engineered features, grouped by physical driver. The ranking matches the chemistry of corrosion: parked aircraft + humidity + acidic pollutants."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d, i) => {
            const share = (d.importance / driversTotal) * 100;
            const Icon =
              d.category === "Parking time"
                ? IconTrendDown
                : d.category === "Aircraft age"
                  ? IconCheck
                  : d.category === "Humidity"
                    ? IconShield
                    : d.category === "Sea-salt exposure"
                      ? IconShield
                      : d.category === "Pollutants"
                        ? IconAlert
                        : IconFlask;
            return (
              <Panel key={d.category}>
                <PanelBody>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="text-brand-bright" size={18} />
                      <div className="text-sm font-semibold">{d.category}</div>
                    </div>
                    <div className="text-2xs uppercase tracking-widest text-fg-faint">#{i + 1}</div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full h-1.5 rounded-full bg-line">
                      <div
                        className="h-1.5 rounded-full bg-brand"
                        style={{ width: `${Math.max(8, Math.min(100, share))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-fg-dim">
                      <span>share of total gain</span>
                      <span className="mono text-fg">{share.toFixed(1)}%</span>
                    </div>
                  </div>
                </PanelBody>
              </Panel>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
