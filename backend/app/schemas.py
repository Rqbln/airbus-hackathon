from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "operational"
    version: str = "1.0.0"


class FleetRiskItem(BaseModel):
    aircraft_id: str
    latest_year_month: str
    calibrated_risk: float
    risk_tier: str
    cei_monthly: float


class MetricsSummary(BaseModel):
    brier: float | None = None
    log_loss: float | None = None
    roc_auc: float | None = None
    ece: float | None = None
    delta_vs_baseline_025: float | None = None
    active_run_id: str | None = None


class TimelinePoint(BaseModel):
    year_month: str
    cei: float
    cum_cei: float
    risk: float


class RunConfigRequest(BaseModel):
    model_name: Literal["lightgbm", "histgb", "logreg", "constant"] = "histgb"
    calibration: Literal["sigmoid", "isotonic", "none"] = "sigmoid"
    feature_set: Literal["full", "base", "cei_only"] = "full"
    n_splits: int = Field(default=5, ge=2, le=10)
    tune: bool = False
    notes: str = ""


class RunStatusResponse(BaseModel):
    run_id: str
    status: str
    metrics: dict[str, Any] | None = None
    config: dict[str, Any] | None = None
    error: str | None = None


class CompareResponse(BaseModel):
    run_a: str
    run_b: str
    metrics: dict[str, Any]
    config_diff: dict[str, Any]


class ROISimulationRequest(BaseModel):
    fleet_size: int = 142
    avg_downtime_cost_per_hour: float = 15000.0
    ccheck_extension_days: int = 3
    high_risk_aircraft_count: int = 10
    inspection_labor_rate: float = 120.0
    software_implementation_cost: float = 250000.0


class ROISimulationResponse(BaseModel):
    annual_savings_usd: float
    avoided_downtime_hours: float
    roi_percentage: float
    payback_months: float
