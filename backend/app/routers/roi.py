"""Simulateur de ROI — traduit le risque prédit en impact financier MRO.

Formule (paramétrable, hypothèses affichées au jury) :
- heures d'immobilisation évitées = avions haut risque x jours d'extension C-check évités x 24
- économies AOG = heures évitées x coût horaire d'immobilisation
- économies d'inspection = avions haut risque x heures d'inspection ciblée économisées x taux horaire
- ROI = (économies totales - coût logiciel) / coût logiciel
"""

from corrotwin_ml import runs
from fastapi import APIRouter

from .. import services
from ..schemas import ROIRequest, ROIResponse

router = APIRouter(prefix="/api/roi", tags=["roi"])


def _high_risk_count_from_active() -> int | None:
    run_id = runs.get_active()
    if run_id is None:
        return None
    try:
        preds = services.predictions(run_id)
    except Exception:
        return None
    latest = preds.sort_values("year_month").groupby("aircraft_id")["corrosion_risk"].last()
    return int((latest >= services.HIGH_THRESHOLD).sum())


@router.post("/simulate", response_model=ROIResponse)
def simulate(req: ROIRequest) -> ROIResponse:
    high_risk = req.high_risk_aircraft
    if high_risk is None:
        high_risk = _high_risk_count_from_active()
    if high_risk is None:
        # Aucune prédiction disponible : hypothèse conservatrice de 7 % de la flotte
        high_risk = max(1, round(req.fleet_size * 0.07))

    avoided_hours = high_risk * req.ccheck_extension_days * 24
    downtime_savings = avoided_hours * req.avg_downtime_cost_per_hour
    inspection_savings = (
        high_risk * req.inspection_hours_saved_per_aircraft * req.inspection_labor_rate
    )
    total = downtime_savings + inspection_savings
    cost = req.software_implementation_cost
    roi_pct = ((total - cost) / cost * 100) if cost > 0 else 0.0

    return ROIResponse(
        high_risk_aircraft=high_risk,
        avoided_downtime_hours=avoided_hours,
        downtime_savings_usd=round(downtime_savings, 2),
        inspection_savings_usd=round(inspection_savings, 2),
        total_savings_usd=round(total, 2),
        roi_percentage=round(roi_pct, 1),
        assumptions={
            "fleet_size": req.fleet_size,
            "avg_downtime_cost_per_hour": req.avg_downtime_cost_per_hour,
            "ccheck_extension_days": req.ccheck_extension_days,
            "inspection_labor_rate": req.inspection_labor_rate,
            "inspection_hours_saved_per_aircraft": req.inspection_hours_saved_per_aircraft,
            "software_implementation_cost": req.software_implementation_cost,
        },
    )
