const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Erreur API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type FleetRiskItem = {
  aircraft_id: string;
  latest_year_month: string;
  calibrated_risk: number;
  risk_tier: string;
  cei_monthly: number;
};

export type MetricsSummary = {
  brier: number | null;
  log_loss: number | null;
  roc_auc: number | null;
  ece: number | null;
  delta_vs_baseline_025: number | null;
  active_run_id: string | null;
};

export type TimelinePoint = {
  year_month: string;
  cei: number;
  cum_cei: number;
  risk: number;
};

export type RunStatus = {
  run_id: string;
  status: string;
  metrics?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  error?: string | null;
};

export type RunConfigRequest = {
  model_name: string;
  calibration: string;
  feature_set: string;
  n_splits: number;
  tune: boolean;
  notes?: string;
};

export type CompareResponse = {
  run_a: string;
  run_b: string;
  metrics: Record<string, { a: number | null; b: number | null; delta: number | null }>;
  config_diff: Record<string, { a: unknown; b: unknown }>;
};

export type ROIRequest = {
  fleet_size: number;
  avg_downtime_cost_per_hour: number;
  ccheck_extension_days: number;
  high_risk_aircraft_count: number;
  inspection_labor_rate: number;
  software_implementation_cost: number;
};

export type ROIResponse = {
  annual_savings_usd: number;
  avoided_downtime_hours: number;
  roi_percentage: number;
  payback_months: number;
};

export const api = {
  health: () => fetchApi<{ status: string }>("/health"),
  metrics: () => fetchApi<MetricsSummary>("/api/metrics"),
  fleetRisk: () => fetchApi<FleetRiskItem[]>("/api/fleet/risk"),
  aircraft: (id: string) => fetchApi<TimelinePoint[]>(`/api/aircraft/${id}`),
  listRuns: () => fetchApi<RunStatus[]>("/api/lab/runs"),
  getRun: (id: string) => fetchApi<RunStatus>(`/api/lab/runs/${id}`),
  startRun: (body: RunConfigRequest) =>
    fetchApi<RunStatus>("/api/lab/runs", { method: "POST", body: JSON.stringify(body) }),
  compareRuns: (a: string, b: string) =>
    fetchApi<CompareResponse>(`/api/lab/compare?run_a=${a}&run_b=${b}`),
  activateRun: (id: string) =>
    fetchApi<{ active_run_id: string }>(`/api/lab/runs/${id}/activate`, { method: "POST" }),
  activeRun: () => fetchApi<{ active_run_id: string | null }>("/api/lab/active"),
  simulateRoi: (body: ROIRequest) =>
    fetchApi<ROIResponse>("/api/roi/simulate", { method: "POST", body: JSON.stringify(body) }),
  submissionUrl: (runId: string) => `${API_BASE}/api/lab/runs/${runId}/submission`,
};
