from __future__ import annotations

from fastapi import APIRouter, HTTPException

from corrotwin_ml.predict import fleet_summary, predict_fleet
from corrotwin_ml.runs import get_active_run_id, load_run

from ..schemas import FleetRiskItem, MetricsSummary

router = APIRouter()


@router.get("/metrics", response_model=MetricsSummary)
def get_metrics() -> MetricsSummary:
    run_id = get_active_run_id()
    if not run_id:
        return MetricsSummary(active_run_id=None)
    try:
        bundle = load_run(run_id)
        m = bundle["metrics"]
        return MetricsSummary(
            brier=m.get("brier"),
            log_loss=m.get("log_loss"),
            roc_auc=m.get("roc_auc"),
            ece=m.get("ece"),
            delta_vs_baseline_025=m.get("delta_vs_baseline_025"),
            active_run_id=run_id,
        )
    except FileNotFoundError:
        return MetricsSummary(active_run_id=None)


@router.get("/fleet/risk", response_model=list[FleetRiskItem])
def fleet_risk() -> list[FleetRiskItem]:
    try:
        preds = predict_fleet()
        rows = fleet_summary(preds)
        return [FleetRiskItem(**r) for r in rows]
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
