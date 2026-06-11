from __future__ import annotations

from fastapi import APIRouter

from ..schemas import ROISimulationRequest, ROISimulationResponse

router = APIRouter()


@router.post("/roi/simulate", response_model=ROISimulationResponse)
def simulate_roi(body: ROISimulationRequest) -> ROISimulationResponse:
    hours_per_day = 24
    avoided_hours = body.high_risk_aircraft_count * body.ccheck_extension_days * hours_per_day
    annual_savings = avoided_hours * body.avg_downtime_cost_per_hour
    net = annual_savings - body.software_implementation_cost
    roi_pct = (net / body.software_implementation_cost * 100) if body.software_implementation_cost else 0.0
    payback = (
        body.software_implementation_cost / (annual_savings / 12)
        if annual_savings > 0
        else 999.0
    )
    return ROISimulationResponse(
        annual_savings_usd=round(annual_savings, 2),
        avoided_downtime_hours=float(avoided_hours),
        roi_percentage=round(roi_pct, 2),
        payback_months=round(payback, 1),
    )
