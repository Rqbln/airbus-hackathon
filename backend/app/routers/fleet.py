"""Risque de corrosion par avion de la flotte test (run actif)."""

from fastapi import APIRouter

from .. import services
from ..schemas import FleetAircraft, FleetRiskResponse

router = APIRouter(prefix="/api/fleet", tags=["flotte"])


@router.get("/risk", response_model=FleetRiskResponse)
def fleet_risk() -> FleetRiskResponse:
    run_id = services.active_run_id()
    preds = services.predictions(run_id)

    latest = (
        preds.sort_values("year_month")
        .groupby("aircraft_id")
        .agg(
            latest_year_month=("year_month", "last"),
            risk=("corrosion_risk", "last"),
            months_observed=("year_month", "count"),
        )
        .reset_index()
        .sort_values("risk", ascending=False)
    )
    aircraft = [
        FleetAircraft(
            aircraft_id=r.aircraft_id,
            latest_year_month=r.latest_year_month,
            risk=round(float(r.risk), 4),
            tier=services.tier_of(float(r.risk)),
            months_observed=int(r.months_observed),
        )
        for r in latest.itertuples()
    ]
    tiers = [a.tier for a in aircraft]
    return FleetRiskResponse(
        run_id=run_id,
        fleet_size=len(aircraft),
        n_high=tiers.count("eleve"),
        n_medium=tiers.count("moyen"),
        n_low=tiers.count("faible"),
        mean_risk=round(float(latest["risk"].mean()), 4),
        aircraft=aircraft,
    )
