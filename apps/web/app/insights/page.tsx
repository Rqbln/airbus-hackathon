import { Badge } from "@/components/ui/Badge";
import { Panel, PanelBody, PanelHeader, Section } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Stat } from "@/components/ui/Stat";
import { BarComparison } from "@/components/charts/BarComparison";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { IconAlert, IconShield } from "@/components/ui/Icons";
import { readCsv, readJson } from "@/lib/data";
import { getScores } from "@/lib/scores";

// Shorter, human-readable feature names for the importance chart.
function shortenFeature(name: string): string {
  const replacements: [RegExp, string][] = [
    [/sulphur_dioxide_mass_mixing_ratio/g, "SO₂"],
    [/nitrogen_monoxide_mass_mixing_ratio/g, "NO"],
    [/nitrogen_dioxide_mass_mixing_ratio/g, "NO₂"],
    [/carbon_monoxide_mass_mixing_ratio/g, "CO"],
    [/ozone_mass_mixing_ratio/g, "O₃"],
    [/sulphate_aerosol_mixing_ratio/g, "sulphate"],
    [/sea_salt_aerosol_(\d+)_(\d+)_mixing_ratio/g, "sea_salt[$1-$2]"],
    [/sea_salt_aerosol/g, "sea_salt"],
    [/dust_aerosol_(\d+)_(\d+)_mixing_ratio/g, "dust[$1-$2]"],
    [/hydrophilic_black_carbon_aerosol_mixing_ratio/g, "BC(philic)"],
    [/hydrophobic_black_carbon_aerosol_mixing_ratio/g, "BC(phobic)"],
    [/hydrophilic_organic_matter_aerosol_mixing_ratio/g, "OM(philic)"],
    [/hydrophobic_organic_matter_aerosol_mixing_ratio/g, "OM(phobic)"],
    [/metar_relative_humidity/g, "RH"],
    [/metar_temperature_c/g, "T_air"],
    [/metar_dew_point_c/g, "T_dew"],
    [/metar_wind_speed_kn/g, "wind"],
    [/metar_visibility_mi/g, "visibility"],
    [/metar_hour_precipitation/g, "precip"],
    [/specific_humidity/g, "q_spec"],
    [/total_parking_minutes/g, "parking"],
    [/organic_nitrates/g, "RONO₂"],
    [/__roll(\d+)_/g, " · roll$1·"],
    [/cum_/g, "cum·"],
  ];
  let n = name;
  replacements.forEach(([rx, rep]) => (n = n.replace(rx, rep)));
  return n;
}

export default function InsightsPage() {
  const scores = getScores();
  const fi = readCsv("feature_importance.csv").map((d) => ({
    feature: d.feature,
    short: shortenFeature(d.feature),
    importance: parseFloat(d.importance),
  }));
  const folds = readCsv("fold_scores.csv").map((d) => ({
    model: d.model,
    fold: parseInt(d.fold, 10),
    brier: parseFloat(d.brier),
    auc: parseFloat(d.auc),
    stage: d.stage,
  }));

  const modelRows = scores.models.map((m) => ({
    name: m.name,
    brier: m.brier,
    color:
      m.name === "logreg"
        ? "#5a6477"
        : m.name === scores.robust?.model
          ? "#2ee79b"
          : "#00b4d8",
  }));
  if (scores.experimental) {
    modelRows.push({
      name: "ensemble + iso",
      brier: scores.experimental.brier,
      color: "#b97aff",
    });
  }

  const bestFolds = folds
    .filter((f) => scores.robust && f.model === scores.robust.model)
    .sort((a, b) => a.fold - b.fold);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="info" dot>
            Model insights
          </Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">What the model learned</h1>
          <p className="text-fg-dim mt-1.5 max-w-3xl">
            How the model is validated, why we trust the robust score, and which physical drivers
            push corrosion risk up.
          </p>
        </div>
      </header>

      {/* Validation discipline */}
      <Section
        eyebrow="Validation discipline"
        title="Honest evaluation"
        description="The whole pipeline is validated with a leakage-free 5-fold GroupKFold by aircraft_id, so the (0, 1) pair of any aircraft never splits between train and validation."
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi small label="Strict aircraft" value="571" hint="have both reference months in env. history" />
          <Kpi small label="Labelled rows" value="1,142" hint="balanced 571 pos · 571 neg" />
          <Kpi small label="CV strategy" value="GroupKFold" tone="info" hint="5 folds · group = aircraft_id" />
          <Kpi small label="Pair split risk" value="0" tone="good" hint="no aircraft pair ever bridges train/val" />
        </div>
      </Section>

      {/* Calibration warning */}
      <Section eyebrow="Calibration" title="Robust vs experimental — and why it matters">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel>
            <PanelHeader
              title="Robust score"
              subtitle="Single best model + best calibration"
              right={<Badge variant="robust">Robust</Badge>}
            />
            <PanelBody>
              <div className="space-y-3">
                <Stat label="Brier (OOF)" value={scores.robust ? scores.robust.brier.toFixed(4) : "—"} tone="good" />
                <Stat label="Model" value={scores.robust?.model ?? "—"} />
                <Stat label="Calibration" value={scores.robust?.calibration ?? "—"} />
                <div className="pt-3 mt-3 border-t border-line text-xs text-fg-dim leading-snug flex gap-2">
                  <IconShield className="text-risk-low mt-0.5 shrink-0" />
                  <span>
                    Honest hold-out estimate: each fold's calibration is fit only on its training folds.
                    This is the number we present to the jury and use to compare submissions.
                  </span>
                </div>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Experimental ensemble"
              subtitle="Weighted GBM mean + isotonic refit on OOF"
              right={<Badge variant="experimental">Optimistic calibration</Badge>}
            />
            <PanelBody>
              <div className="space-y-3">
                <Stat
                  label="Brier (OOF, post-iso)"
                  value={scores.experimental ? scores.experimental.brier.toFixed(4) : "—"}
                  tone="warn"
                />
                <Stat
                  label="Brier (OOF, raw ensemble)"
                  value={scores.experimental ? scores.experimental.brierUncalibrated.toFixed(4) : "—"}
                />
                <Stat label="Calibration" value={scores.experimental?.calibration ?? "—"} />
                <div className="pt-3 mt-3 border-t border-line text-xs text-fg-dim leading-snug flex gap-2">
                  <IconAlert className="text-tag-experimental mt-0.5 shrink-0" />
                  <span>
                    The isotonic curve is fit on the very out-of-fold predictions it then evaluates. This
                    is mildly optimistic; the private leaderboard may regress towards the robust score.
                  </span>
                </div>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </Section>

      {/* Model comparison */}
      <Section eyebrow="Models" title="Brier score by model" description="5-fold OOF — lower is better.">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel className="xl:col-span-2">
            <PanelHeader title="Comparison" subtitle="Single models + final ensemble" />
            <PanelBody>
              <BarComparison data={modelRows} xKey="name" yKey="brier" colorKey="color" domain={[0, 0.22]} showValueLabel />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Fold-by-fold"
              subtitle={`Best model · ${scores.robust?.model ?? "—"}`}
            />
            <PanelBody>
              <div className="space-y-2">
                {bestFolds.length === 0 ? (
                  <div className="text-sm text-fg-dim">no fold data</div>
                ) : (
                  bestFolds.map((f) => (
                    <div key={f.fold} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-fg-dim">Fold {f.fold}</span>
                      <div className="flex-1 mx-3 h-1 bg-line rounded">
                        <div
                          className="h-1 bg-brand rounded"
                          style={{ width: `${Math.min(100, (1 - f.brier / 0.25) * 100)}%` }}
                        />
                      </div>
                      <span className="mono text-fg">{f.brier.toFixed(4)}</span>
                    </div>
                  ))
                )}
              </div>
            </PanelBody>
          </Panel>
        </div>
      </Section>

      {/* Feature importance */}
      <Section
        eyebrow="Drivers"
        title="Top 30 features (gain)"
        description="From the best gradient-boosted model. Rolling-window aggregates (12, 24 months) and cumulative exposures dominate."
      >
        <Panel>
          <PanelBody>
            {fi.length > 0 ? (
              <HorizontalBar data={fi.slice(0, 30).reverse().map((f) => ({ ...f, label: f.short }))} xKey="importance" yKey="label" />
            ) : (
              <div className="text-sm text-fg-dim py-12 text-center">no feature-importance file</div>
            )}
          </PanelBody>
        </Panel>
      </Section>
    </div>
  );
}
