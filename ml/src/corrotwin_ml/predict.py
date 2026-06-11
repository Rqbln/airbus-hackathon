from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from .config import SUBMISSIONS_DIR
from .data import load_environment_test, load_sample_submission
from .features import engineer_features, select_feature_matrix
from .models import predict_proba_positive
from .runs import get_active_run_id, load_run


def predict_fleet(run_id: str | None = None) -> pd.DataFrame:
    run_id = run_id or get_active_run_id()
    if not run_id:
        raise RuntimeError("Aucun run actif. Entraînez un modèle d'abord.")
    bundle = load_run(run_id)
    model = bundle["model"]
    feature_names = bundle["features"]
    config = bundle["config"]

    env_test = load_environment_test()
    feat_df = engineer_features(env_test, feature_set=config.get("feature_set", "full"))
    X, cols = select_feature_matrix(feat_df, feature_set=config.get("feature_set", "full"))
    for c in feature_names:
        if c not in X.columns:
            X[c] = 0.0
    X = X[feature_names]

    probs = np.clip(predict_proba_positive(model, X), 0.0, 1.0)
    out = feat_df[["aircraft_id", "year_month", "month_start_date"]].copy()
    out["corrosion_risk"] = probs
    out["cei_monthly"] = feat_df.get("cei_monthly", 0)
    out["cum_cei"] = feat_df.get("cum_cei", 0)
    return out


def fleet_summary(predictions: pd.DataFrame) -> list[dict]:
    latest = (
        predictions.sort_values(["aircraft_id", "year_month"])
        .groupby("aircraft_id", as_index=False)
        .tail(1)
    )

    def tier(p: float) -> str:
        if p >= 0.75:
            return "Élevé"
        if p >= 0.4:
            return "Moyen"
        return "Faible"

    rows = []
    for _, r in latest.iterrows():
        rows.append(
            {
                "aircraft_id": r["aircraft_id"],
                "latest_year_month": r["year_month"],
                "calibrated_risk": float(r["corrosion_risk"]),
                "risk_tier": tier(float(r["corrosion_risk"])),
                "cei_monthly": float(r.get("cei_monthly", 0) or 0),
            }
        )
    return rows


def aircraft_timeline(aircraft_id: str, run_id: str | None = None) -> list[dict]:
    preds = predict_fleet(run_id)
    sub = preds[preds["aircraft_id"] == aircraft_id].sort_values("year_month")
    return [
        {
            "year_month": r["year_month"],
            "cei": float(r.get("cei_monthly", 0) or 0),
            "cum_cei": float(r.get("cum_cei", 0) or 0),
            "risk": float(r["corrosion_risk"]),
        }
        for _, r in sub.iterrows()
    ]


def export_submission(run_id: str | None = None, output: Path | None = None) -> Path:
    run_id = run_id or get_active_run_id()
    preds = predict_fleet(run_id)
    sample = load_sample_submission()
    merged = sample[["id"]].merge(
        preds.assign(id=preds["aircraft_id"] + "_" + preds["year_month"]),
        on="id",
        how="left",
    )
    if merged["corrosion_risk"].isna().any():
        missing = int(merged["corrosion_risk"].isna().sum())
        raise ValueError(f"{missing} lignes sans prédiction — vérifiez les clés id")
    merged["corrosion_risk"] = merged["corrosion_risk"].clip(0.0, 1.0)
    out = output or SUBMISSIONS_DIR / f"submission_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    merged[["id", "corrosion_risk"]].to_csv(out, index=False)
    return out
