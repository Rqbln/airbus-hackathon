/**
 * Score extraction with explicit honesty:
 *   - "Robust" = best single model + chosen calibration (validated on hold-out folds).
 *   - "Experimental" = weighted ensemble + isotonic refit on OOF predictions.
 *     Isotonic refit on the very predictions we evaluate is slightly optimistic.
 */
import { readJson } from "./data";

type ModelMetrics = {
  baseline?: {
    name?: string;
    brier_mean?: number;
    brier_std?: number;
    auc_mean?: number;
    n_features?: number;
  };
  feature_engineering?: {
    best_model: string;
    best_calibration: string;
    models: Record<string, { brier_mean: number; brier_std: number; auc_mean: number }>;
    n_features: number;
  };
  ensemble?: {
    components: { name: string; brier_oof: number; weight: number }[];
    brier_raw: number;
    brier_calibrated: number;
    calibration_used: string;
  };
};

type FeMetrics = {
  best_model: string;
  best_calibration: string;
  calibration_results?: Record<string, { brier_mean: number; brier_std?: number; auc_mean?: number }>;
};

export type ScoreSnapshot = {
  baseline: { brier: number; name: string; nFeatures: number } | null;
  robust: { brier: number; model: string; calibration: string } | null;
  experimental: { brier: number; brierUncalibrated: number; calibration: string } | null;
  models: { name: string; brier: number; std: number; auc: number }[];
};

export function getScores(): ScoreSnapshot {
  const mm = readJson<ModelMetrics>("model_metrics.json");
  const fe = readJson<FeMetrics>("fe_v1_metrics.json");

  const baseline = mm?.baseline?.brier_mean
    ? {
        brier: mm.baseline.brier_mean,
        name: mm.baseline.name || "Baseline",
        nFeatures: mm.baseline.n_features ?? 33,
      }
    : null;

  const robust = (() => {
    if (!mm?.feature_engineering) return null;
    const bestModel = mm.feature_engineering.best_model;
    const bestCal = mm.feature_engineering.best_calibration;
    // Prefer the explicit calibration result; fall back to the model's raw brier.
    const calBrier = fe?.calibration_results?.[bestCal]?.brier_mean;
    const rawBrier = mm.feature_engineering.models[bestModel]?.brier_mean;
    const brier = calBrier ?? rawBrier ?? null;
    if (brier == null) return null;
    return { brier, model: bestModel, calibration: bestCal };
  })();

  const experimental = mm?.ensemble
    ? {
        brier: mm.ensemble.brier_calibrated,
        brierUncalibrated: mm.ensemble.brier_raw,
        calibration: mm.ensemble.calibration_used,
      }
    : null;

  const models = mm?.feature_engineering
    ? Object.entries(mm.feature_engineering.models).map(([name, v]) => ({
        name,
        brier: v.brier_mean,
        std: v.brier_std,
        auc: v.auc_mean,
      }))
    : [];

  return { baseline, robust, experimental, models };
}

export function pct(value: number, base: number = 0.25) {
  return ((1 - value / base) * 100).toFixed(1);
}
