// Client API unique — toutes les réponses du backend FastAPI sont typées ici.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RiskTier = "faible" | "moyen" | "eleve";

export interface FleetAircraft {
  aircraft_id: string;
  latest_year_month: string;
  risk: number;
  tier: RiskTier;
  months_observed: number;
}

export interface FleetRisk {
  run_id: string;
  fleet_size: number;
  n_high: number;
  n_medium: number;
  n_low: number;
  mean_risk: number;
  aircraft: FleetAircraft[];
}

export interface AircraftMonth {
  year_month: string;
  risk: number | null;
  risk_smooth: number | null;
  cei: number | null;
  cei_cum: number | null;
  cei_index: number | null;
  humidity: number | null;
  chloride: number | null;
  so2: number | null;
  parking_hours: number | null;
}

export interface AircraftDetail {
  aircraft_id: string;
  run_id: string;
  latest_risk: number;
  tier: RiskTier;
  timeline: AircraftMonth[];
}

export interface RunSummary {
  brier: number | null;
  brier_uncalibrated: number | null;
  log_loss: number | null;
  auc: number | null;
  ece: number | null;
  brier_per_fold_mean: number | null;
  brier_per_fold_std: number | null;
  n_features: number | null;
  duration_seconds: number | null;
  delta_vs_baseline: number | null;
}

export interface RunConfig {
  name: string;
  model: string;
  model_params: Record<string, unknown>;
  feature_set: string;
  calibration: string;
  n_splits: number;
  seed: number;
  notes: string;
}

export interface RunListItem {
  run_id: string;
  status: "pending" | "running" | "done" | "failed" | "unknown";
  error: string | null;
  config: RunConfig;
  is_active: boolean;
  summary: RunSummary;
}

export interface CalibrationBin {
  bin: number;
  p_moyen: number | null;
  freq_observee: number | null;
  effectif: number;
}

export interface HistogramBin {
  bin_min: number;
  bin_max: number;
  sains: number;
  corrodes: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface RunMetrics {
  brier: number;
  brier_uncalibrated: number;
  log_loss: number;
  auc: number | null;
  ece: number;
  brier_decomposition: {
    reliability: number;
    resolution: number;
    uncertainty: number;
  };
  calibration_curve: CalibrationBin[];
  prediction_histogram: HistogramBin[];
  brier_baseline_constant: number;
  brier_baseline_prevalence: number;
  brier_per_fold: number[];
  brier_per_fold_mean: number;
  brier_per_fold_std: number;
  permutation_importance: FeatureImportance[];
  gain_importance: FeatureImportance[];
  n_features: number;
  feature_columns: string[];
  n_rows: number;
  n_aircraft: number;
  duration_seconds: number;
}

export interface RunDetail {
  run_id: string;
  config: RunConfig;
  status: string;
  error: string | null;
  metrics: RunMetrics | null;
  is_active?: boolean;
}

export interface LabOptions {
  models: string[];
  feature_sets: { id: string; label: string }[];
  calibrations: { id: string; label: string }[];
  defaults: RunConfig;
}

export interface ROIRequest {
  fleet_size: number;
  avg_downtime_cost_per_hour: number;
  ccheck_extension_days: number;
  inspection_labor_rate: number;
  inspection_hours_saved_per_aircraft: number;
  software_implementation_cost: number;
  high_risk_aircraft?: number | null;
}

export interface ROIResult {
  high_risk_aircraft: number;
  avoided_downtime_hours: number;
  downtime_savings_usd: number;
  inspection_savings_usd: number;
  total_savings_usd: number;
  roi_percentage: number;
  assumptions: Record<string, number>;
}

export interface ActiveMetrics {
  active_run: string | null;
  config?: RunConfig;
  metrics?: RunMetrics;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Erreur API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; active_run: string | null }>("/health"),
  activeMetrics: () => request<ActiveMetrics>("/api/metrics"),
  fleetRisk: () => request<FleetRisk>("/api/fleet/risk"),
  aircraft: (id: string) => request<AircraftDetail>(`/api/aircraft/${id}`),
  labOptions: () => request<LabOptions>("/api/lab/options"),
  listRuns: () =>
    request<{ active_run: string | null; runs: RunListItem[] }>("/api/lab/runs"),
  runDetail: (id: string) => request<RunDetail>(`/api/lab/runs/${id}`),
  createRun: (config: Partial<RunConfig>) =>
    request<{ run_id: string; status: string }>("/api/lab/runs", {
      method: "POST",
      body: JSON.stringify(config),
    }),
  activateRun: (id: string) =>
    request<{ active_run: string }>(`/api/lab/runs/${id}/activate`, {
      method: "POST",
    }),
  deleteRun: (id: string) =>
    request<{ deleted: string }>(`/api/lab/runs/${id}`, { method: "DELETE" }),
  simulateROI: (body: ROIRequest) =>
    request<ROIResult>("/api/roi/simulate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  submissionUrl: (id: string) => `${API_URL}/api/lab/runs/${id}/submission`,
};
