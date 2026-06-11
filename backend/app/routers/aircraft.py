"""Jumeau numérique : historique d'exposition et de risque d'un aéronef."""

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from .. import services
from ..schemas import AircraftDetailResponse, AircraftMonth

router = APIRouter(prefix="/api/aircraft", tags=["aeronef"])


def _safe(value) -> float | None:
    if value is None or (isinstance(value, float) and not np.isfinite(value)):
        return None
    return float(value)


@router.get("/{aircraft_id}", response_model=AircraftDetailResponse)
def aircraft_detail(aircraft_id: str) -> AircraftDetailResponse:
    run_id = services.active_run_id()
    preds = services.predictions(run_id)
    feats = services.test_features()

    p = preds[preds["aircraft_id"] == aircraft_id]
    f = feats[feats["aircraft_id"] == aircraft_id]
    if p.empty and f.empty:
        raise HTTPException(status_code=404, detail=f"Aéronef inconnu : {aircraft_id}")

    merged = pd.merge(
        f, p[["year_month", "corrosion_risk"]], on="year_month", how="outer"
    ).sort_values("year_month")

    timeline = [
        AircraftMonth(
            year_month=str(r.year_month),
            risk=_safe(getattr(r, "corrosion_risk", None)),
            cei=_safe(r.corrosivity_increment),
            cei_cum=_safe(r.corrosivity_increment_cum),
            humidity=_safe(r.metar_relative_humidity),
            chloride=_safe(r.chloride),
            so2=_safe(r.sulphur_dioxide_mass_mixing_ratio),
            parking_hours=_safe(r.parking_hours),
        )
        for r in merged.itertuples()
    ]
    risks = [m.risk for m in timeline if m.risk is not None]
    latest_risk = risks[-1] if risks else 0.0
    return AircraftDetailResponse(
        aircraft_id=aircraft_id,
        run_id=run_id,
        latest_risk=round(latest_risk, 4),
        tier=services.tier_of(latest_risk),
        timeline=timeline,
    )
