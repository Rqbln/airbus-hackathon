"""Configuration d'une expérience — tout le benchmark est piloté par cet objet."""

from typing import Any, Literal

from pydantic import BaseModel, Field

ModelName = Literal["lightgbm", "histgb", "logreg", "constant", "ensemble"]
CalibrationMethod = Literal["none", "sigmoid", "isotonic"]
FeatureSet = Literal["full", "no_age", "raw"]

# Hyperparamètres de référence (baseline Moh, notebook 05 : Brier 0.1514 / AUC 0.870)
DEFAULT_PARAMS: dict[str, dict[str, Any]] = {
    "histgb": {
        "max_iter": 300,
        "learning_rate": 0.05,
        "max_leaf_nodes": 31,
        "l2_regularization": 1.0,
    },
    "lightgbm": {
        "n_estimators": 400,
        "learning_rate": 0.05,
        "num_leaves": 31,
        "min_child_samples": 20,
        "reg_lambda": 1.0,
        "subsample": 0.9,
        "colsample_bytree": 0.9,
        "verbosity": -1,
    },
    "logreg": {"C": 1.0, "max_iter": 2000},
    "constant": {"value": 0.5},
}


class ExperimentConfig(BaseModel):
    """Définit entièrement un run : modèle, features, calibration, validation."""

    name: str = ""
    model: ModelName = "histgb"
    model_params: dict[str, Any] = Field(default_factory=dict)
    feature_set: FeatureSet = "full"
    calibration: CalibrationMethod = "sigmoid"
    n_splits: int = Field(default=5, ge=2, le=10)
    seed: int = 42
    notes: str = ""

    def resolved_params(self) -> dict[str, Any]:
        base = dict(DEFAULT_PARAMS.get(self.model, {}))
        base.update(self.model_params)
        return base

    def slug(self) -> str:
        cal = self.calibration if self.calibration != "none" else "nocal"
        return f"{self.model}_{self.feature_set}_{cal}_cv{self.n_splits}"
