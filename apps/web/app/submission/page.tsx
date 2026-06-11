import { Badge } from "@/components/ui/Badge";
import { Panel, PanelBody, PanelHeader, Section } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Stat } from "@/components/ui/Stat";
import { IconCheck, IconAlert, IconShield } from "@/components/ui/Icons";
import { listSubmissions, readJson, readSubmissionPreview } from "@/lib/data";
import { getScores } from "@/lib/scores";

type SubSummary = {
  file: string;
  rows: number;
  unique_aircraft: number;
  columns: string[];
  predictions: {
    min: number;
    p10: number;
    median: number;
    mean: number;
    p90: number;
    max: number;
  };
  sample_rows: { id: string; corrosion_risk: number | string }[];
  format_valid: boolean;
};

function fmt(n: number, d = 4) {
  return n.toFixed(d);
}

const SUBMISSION_LABELS: Record<string, { tag: "Robust" | "Experimental" | "Baseline" | "Raw"; variant: "robust" | "experimental" | "muted" | "info"; description: string }> = {
  "submission_baseline.csv": {
    tag: "Baseline",
    variant: "muted",
    description: "LightGBM on raw features only — kept as reference for the v0 score.",
  },
  "submission_fe_v1.csv": {
    tag: "Robust",
    variant: "robust",
    description: "Best single model + calibration (CatBoost + isotonic). The robust pick for the leaderboard.",
  },
  "submission_best_model_raw.csv": {
    tag: "Raw",
    variant: "info",
    description: "Same best model, no calibration. Useful sanity check.",
  },
  "submission_ensemble_v1.csv": {
    tag: "Experimental",
    variant: "experimental",
    description: "Weighted ensemble + isotonic refit. Best OOF but optimistic by construction.",
  },
};

export default function SubmissionPage() {
  const summary = readJson<SubSummary>("submission_summary.json");
  const subs = listSubmissions();
  const scores = getScores();

  // Strategy: recommend submission_fe_v1.csv as robust, ensemble as experimental.
  const robustFile = "submission_fe_v1.csv";
  const experimentalFile = "submission_ensemble_v1.csv";
  const robustPreview = readSubmissionPreview(robustFile, 12);
  const experimentalPreview = readSubmissionPreview(experimentalFile, 12);

  const expectedRows = 14303;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="info" dot>
            Submission
          </Badge>
          <Badge variant="muted">{subs.length} CSV on disk</Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Submission package</h1>
          <p className="text-fg-dim mt-1.5 max-w-3xl">
            Two viable submissions: a <span className="text-risk-low">robust</span> file built from a single
            calibrated model, and an <span className="text-tag-experimental">experimental</span> ensemble with
            slightly optimistic calibration. Pick one per Kaggle slot.
          </p>
        </div>
      </header>

      {/* === Recommendation === */}
      <Section eyebrow="Recommendation" title="Which file to submit?">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel className="border border-tag-robust/40">
            <PanelHeader
              title="Robust pick"
              subtitle="submission_fe_v1.csv"
              right={<Badge variant="robust">Recommended</Badge>}
            />
            <PanelBody>
              <div className="space-y-3">
                <Stat
                  label="Robust CV Brier"
                  value={scores.robust ? scores.robust.brier.toFixed(4) : "—"}
                  tone="good"
                />
                <Stat label="Model" value={scores.robust?.model ?? "—"} />
                <Stat label="Calibration" value={scores.robust?.calibration ?? "—"} />
                <Stat label="Rows" value={robustPreview.total.toLocaleString()} />
                <div className="pt-3 mt-3 border-t border-line text-xs text-fg-dim leading-snug flex gap-2">
                  <IconShield className="text-risk-low mt-0.5 shrink-0" />
                  <span>
                    Generalization-safe — calibration is fit only on each fold's training subset. Use this if
                    the public LB is volatile or if your second slot is uncertain.
                  </span>
                </div>
              </div>
            </PanelBody>
          </Panel>

          <Panel className="border border-tag-experimental/40">
            <PanelHeader
              title="Experimental pick"
              subtitle="submission_ensemble_v1.csv"
              right={<Badge variant="experimental">Aggressive</Badge>}
            />
            <PanelBody>
              <div className="space-y-3">
                <Stat
                  label="Brier (post-isotonic)"
                  value={scores.experimental ? scores.experimental.brier.toFixed(4) : "—"}
                  tone="warn"
                />
                <Stat
                  label="Brier (raw ensemble)"
                  value={scores.experimental ? scores.experimental.brierUncalibrated.toFixed(4) : "—"}
                />
                <Stat label="Components" value="LGBM · XGB · CB · HGB" />
                <Stat label="Rows" value={experimentalPreview.total.toLocaleString()} />
                <div className="pt-3 mt-3 border-t border-line text-xs text-fg-dim leading-snug flex gap-2">
                  <IconAlert className="text-tag-experimental mt-0.5 shrink-0" />
                  <span>
                    Optimistic by design — the isotonic curve sees the OOF preds it then evaluates. Use this
                    as your high-variance / high-reward submission slot.
                  </span>
                </div>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </Section>

      {/* === Format check === */}
      <Section eyebrow="Format check" title="Submission validity">
        <Panel>
          <PanelBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Check
                ok={summary?.columns?.length === 2}
                label="Columns"
                value={summary?.columns?.join(", ") ?? "—"}
                detail="Expected: id, corrosion_risk"
              />
              <Check
                ok={summary?.rows === expectedRows}
                label="Row count"
                value={summary ? summary.rows.toLocaleString() : "—"}
                detail={`Expected: ${expectedRows.toLocaleString()}`}
              />
              <Check
                ok={!!summary && summary.predictions.min >= 0 && summary.predictions.max <= 1}
                label="Probabilities in [0, 1]"
                value={summary ? `[${fmt(summary.predictions.min, 3)}, ${fmt(summary.predictions.max, 3)}]` : "—"}
                detail="min / max range"
              />
              <Check
                ok={summary?.unique_aircraft === 142}
                label="Aircraft coverage"
                value={summary ? `${summary.unique_aircraft} aircraft` : "—"}
                detail="Expected: 142"
              />
            </div>
          </PanelBody>
        </Panel>
      </Section>

      {/* === Side-by-side previews === */}
      <Section eyebrow="Preview" title="First 12 rows · robust vs experimental">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel>
            <PanelHeader
              title="Robust · submission_fe_v1.csv"
              subtitle={`${robustPreview.total.toLocaleString()} rows`}
              right={<Badge variant="robust">Recommended</Badge>}
            />
            <PanelBody pad={false}>
              <PreviewTable rows={robustPreview.rows} />
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader
              title="Experimental · submission_ensemble_v1.csv"
              subtitle={`${experimentalPreview.total.toLocaleString()} rows`}
              right={<Badge variant="experimental">Aggressive</Badge>}
            />
            <PanelBody pad={false}>
              <PreviewTable rows={experimentalPreview.rows} />
            </PanelBody>
          </Panel>
        </div>
      </Section>

      {/* === All submissions === */}
      <Section eyebrow="Files" title="All submissions on disk">
        <Panel>
          <PanelBody pad={false}>
            <table className="w-full text-sm">
              <thead className="text-2xs uppercase tracking-widest text-fg-faint">
                <tr className="border-b border-line">
                  <th className="text-left py-2.5 px-5">File</th>
                  <th className="text-left py-2.5 px-2">Type</th>
                  <th className="text-left py-2.5 px-2">Description</th>
                  <th className="text-right py-2.5 px-5">Size</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => {
                  const meta = SUBMISSION_LABELS[s.name];
                  return (
                    <tr key={s.name} className="border-b border-line/40 hover:bg-ink-3/50 transition">
                      <td className="py-2.5 px-5 mono text-fg">{s.name}</td>
                      <td className="py-2.5 px-2">
                        {meta ? <Badge variant={meta.variant}>{meta.tag}</Badge> : <Badge variant="muted">—</Badge>}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-fg-dim">{meta?.description ?? ""}</td>
                      <td className="py-2.5 px-5 text-right mono text-fg-dim">
                        {(s.bytes / 1024).toFixed(1)} kB
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PanelBody>
        </Panel>
      </Section>
    </div>
  );
}

function Check({ ok, label, value, detail }: { ok?: boolean; label: string; value: string; detail?: string }) {
  return (
    <div className="border border-line rounded p-3 bg-ink-1/40">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${ok ? "bg-risk-low/15 text-risk-low" : "bg-risk-mid/15 text-risk-mid"}`}>
          {ok ? <IconCheck size={12} /> : <IconAlert size={12} />}
        </span>
        <span className="text-2xs uppercase tracking-widest text-fg-faint">{label}</span>
      </div>
      <div className="mt-1.5 mono text-sm text-fg">{value}</div>
      {detail && <div className="text-2xs text-fg-faint mt-0.5">{detail}</div>}
    </div>
  );
}

function PreviewTable({ rows }: { rows: { id: string; corrosion_risk: string | number }[] }) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full text-sm">
        <thead className="text-2xs uppercase tracking-widest text-fg-faint">
          <tr className="border-b border-line">
            <th className="text-left py-2 px-5">id</th>
            <th className="text-right py-2 px-5">corrosion_risk</th>
          </tr>
        </thead>
        <tbody className="mono">
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/40">
              <td className="py-1.5 px-5 text-fg">{r.id}</td>
              <td className="py-1.5 px-5 text-right text-brand-bright">
                {parseFloat(r.corrosion_risk as string).toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
