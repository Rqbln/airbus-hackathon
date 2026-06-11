from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[3]
DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"
ARTIFACTS = ROOT / "data" / "artifacts"
RUNS_DIR = ARTIFACTS / "runs"
SUBMISSIONS_DIR = ROOT / "data" / "submissions"
ACTIVE_RUN_FILE = ARTIFACTS / "active_run.txt"

ModelName = Literal["lightgbm", "histgb", "logreg", "constant"]
CalibrationMethod = Literal["sigmoid", "isotonic", "none"]
FeatureSet = Literal["full", "base", "cei_only"]


class ExperimentConfig(BaseModel):
    model_name: ModelName = "histgb"
    calibration: CalibrationMethod = "sigmoid"
    feature_set: FeatureSet = "full"
    n_splits: int = Field(default=5, ge=2, le=10)
    random_state: int = 42
    offset_months: int = 24
    drop_missing_env: bool = True
  # hyperparams optionnels
    n_estimators: int = 200
    max_depth: int = 6
    learning_rate: float = 0.05
    tune: bool = False
    tune_iterations: int = 15
    ensemble: bool = False
    notes: str = ""

    def slug(self) -> str:
        return (
            f"{self.model_name}_{self.feature_set}_{self.calibration}"
            f"_cv{self.n_splits}"
        )
