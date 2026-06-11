"""Jumeau numérique : historique d'exposition et de risque d'un aéronef."""

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from .. import services
from ..constants import AIRCRAFT_RISK_ROLLING_MONTHS
from ..schemas import AircraftDetailResponse, AircraftMonth

router = APIRouter(prefix="/api/aircraft", tags=["aeronef"])


def _safe(value) -> float | None:
    if value is None or (isinstance(value, float) and not np.isfinite(value)):
        return None
    return float(value)


def _normalize_series(s: pd.Series) -> pd.Series:
    lo, hi = s.min(), s.max()
    if not np.isfinite(lo) or not np.isfinite(hi) or hi <= lo:
        return pd.Series(50.0, index=s.index)
    return (s - lo) / (hi - lo) * 100


@router.get("/{aircraft_id}", response_model=AircraftDetailResponse)
def aircraft_detail(aircraft_id: str) -> AircraftDetailResponse:
    run_id = services.active_run_id()
    preds = services.predictions(run_id)
    feats = services.test_features()

    p = preds[preds["aircraft_id"] == aircraft_id][["year_month", "corrosion_risk"]]
    f = feats[feats["aircraft_id"] == aircraft_id]
    if p.empty and f.empty:
        raise HTTPException(status_code=404, detail=f"Aéronef inconnu : {aircraft_id}")

    merged = (
        pd.merge(f, p, on="year_month", how="inner")
        .sort_values("year_month")
        .reset_index(drop=True)
    )
    merged["corrosion_risk"] = merged["corrosion_risk"].clip(0, 1)
    merged["risk_smooth"] = (
        merged["corrosion_risk"]
        .rolling(AIRCRAFT_RISK_ROLLING_MONTHS, min_periods=1, center=True)
        .mean()
        .clip(0, 1)
    )
    merged["cei_index"] = _normalize_series(merged["corrosivity_increment_cum"].fillna(0))

    timeline = [
        AircraftMonth(
            year_month=str(r.year_month),
            risk=_safe(r.corrosion_risk),
            risk_smooth=_safe(r.risk_smooth),
            cei=_safe(r.corrosivity_increment),
            cei_cum=_safe(r.corrosivity_increment_cum),
            cei_index=_safe(r.cei_index),
            humidity=_safe(r.metar_relative_humidity),
            chloride=_safe(r.chloride),
            so2=_safe(r.sulphur_dioxide_mass_mixing_ratio),
            parking_hours=_safe(r.parking_hours),
        )
        for r in merged.itertuples()
    ]
    risks = [m.risk_smooth for m in timeline if m.risk_smooth is not None]
    latest_risk = risks[-1] if risks else 0.0
    return AircraftDetailResponse(
        aircraft_id=aircraft_id,
        run_id=run_id,
        latest_risk=round(latest_risk, 4),
        tier=services.tier_of(latest_risk),
        timeline=timeline,
    )
