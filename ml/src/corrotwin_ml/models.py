from __future__ import annotations

import sys

import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .config import ExperimentConfig, ModelName

LIGHTGBM_AVAILABLE = False
if sys.version_info < (3, 14):
    try:
        from lightgbm import LGBMClassifier

        LIGHTGBM_AVAILABLE = True
    except ImportError:
        LIGHTGBM_AVAILABLE = False


class ConstantProbaClassifier(BaseEstimator, ClassifierMixin):
    """Prédit une probabilité constante (ex. 0.5 baseline Brier = 0.25)."""

    def __init__(self, probability: float = 0.5):
        self.probability = probability

    def fit(self, X, y=None):
        return self

    def predict_proba(self, X):
        n = len(X)
        p = float(self.probability)
        return np.column_stack([np.full(n, 1 - p), np.full(n, p)])

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)


def resolve_model_name(name: ModelName) -> ModelName:
    if name == "lightgbm" and not LIGHTGBM_AVAILABLE:
        return "histgb"
    return name


def create_estimator(config: ExperimentConfig):
    name = resolve_model_name(config.model_name)

    if name == "constant":
        return ConstantProbaClassifier(probability=0.5)

    if name == "logreg":
        return Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "clf",
                    LogisticRegression(
                        max_iter=1000,
                        random_state=config.random_state,
                        class_weight="balanced",
                    ),
                ),
            ]
        )

    if name == "lightgbm" and LIGHTGBM_AVAILABLE:
        return LGBMClassifier(
            n_estimators=config.n_estimators,
            max_depth=config.max_depth,
            learning_rate=config.learning_rate,
            random_state=config.random_state,
            verbosity=-1,
            class_weight="balanced",
        )

    return HistGradientBoostingClassifier(
        max_iter=config.n_estimators,
        max_depth=config.max_depth,
        learning_rate=config.learning_rate,
        random_state=config.random_state,
    )


def predict_proba_positive(estimator, X) -> np.ndarray:
    if hasattr(estimator, "predict_proba"):
        proba = estimator.predict_proba(X)
        if proba.ndim == 2 and proba.shape[1] == 2:
            return proba[:, 1]
        return proba.ravel()
    preds = estimator.predict(X)
    return np.clip(preds.astype(float), 0.0, 1.0)
