"""Schémas Pydantic de l'API Bob-corn."""

from typing import Any, Literal

from pydantic import BaseModel, Field

RiskTier = Literal["faible", "moyen", "eleve"]


class FleetAircraft(BaseModel):
    aircraft_id: str
    latest_year_month: str
    risk: float
    tier: RiskTier
    months_observed: int


class FleetRiskResponse(BaseModel):
    run_id: str
    fleet_size: int
    n_high: int
    n_medium: int
    n_low: int
    mean_risk: float
    aircraft: list[FleetAircraft]


class AircraftMonth(BaseModel):
    year_month: str
    risk: float | None = None
    cei: float | None = None  # corrosivity_increment (indice ISO 9223 mensuel)
    cei_cum: float | None = None
    humidity: float | None = None
    chloride: float | None = None
    so2: float | None = None
    parking_hours: float | None = None


class AircraftDetailResponse(BaseModel):
    aircraft_id: str
    run_id: str
    latest_risk: float
    tier: RiskTier
    timeline: list[AircraftMonth]


class RunRequest(BaseModel):
    name: str = ""
    model: Literal["lightgbm", "histgb", "logreg", "constant", "ensemble"] = "histgb"
    model_params: dict[str, Any] = Field(default_factory=dict)
    feature_set: Literal["full", "no_age", "raw"] = "full"
    calibration: Literal["none", "sigmoid", "isotonic"] = "sigmoid"
    n_splits: int = Field(default=5, ge=2, le=10)
    seed: int = 42
    notes: str = ""


class RunCreatedResponse(BaseModel):
    run_id: str
    status: str


class ROIRequest(BaseModel):
    fleet_size: int = Field(default=142, ge=1)
    avg_downtime_cost_per_hour: float = Field(default=15000.0, ge=0)
    ccheck_extension_days: int = Field(default=3, ge=0)
    inspection_labor_rate: float = Field(default=120.0, ge=0)
    inspection_hours_saved_per_aircraft: float = Field(default=40.0, ge=0)
    software_implementation_cost: float = Field(default=250000.0, ge=0)
    high_risk_aircraft: int | None = Field(
        default=None,
        description="Nombre d'avions haut risque ; par défaut, lu depuis le run actif",
    )


class ROIResponse(BaseModel):
    high_risk_aircraft: int
    avoided_downtime_hours: float
    downtime_savings_usd: float
    inspection_savings_usd: float
    total_savings_usd: float
    roi_percentage: float
    assumptions: dict[str, float]
