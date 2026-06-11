"""Registre des modèles — ajouter un modèle = une entrée dans REGISTRY."""

from typing import Any

import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:
    from lightgbm import LGBMClassifier

    HAS_LIGHTGBM = True
except ImportError:  # pragma: no cover - fallback HistGB documenté
    HAS_LIGHTGBM = False


class ConstantClassifier(BaseEstimator, ClassifierMixin):
    """Baseline : prédit une probabilité constante (0.5 -> Brier 0.25)."""

    def __init__(self, value: float = 0.5):
        self.value = value

    def fit(self, X, y):
        self.classes_ = np.array([0, 1])
        return self

    def predict_proba(self, X):
        p = np.full(len(X), self.value)
        return np.column_stack([1 - p, p])

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)


def _make_histgb(params: dict[str, Any], seed: int):
    return HistGradientBoostingClassifier(random_state=seed, **params)


def _make_lightgbm(params: dict[str, Any], seed: int):
    if not HAS_LIGHTGBM:
        raise RuntimeError(
            "lightgbm n'est pas installé — utiliser le modèle 'histgb' (fallback)"
        )
    return LGBMClassifier(random_state=seed, **params)


def _make_logreg(params: dict[str, Any], seed: int):
    # La régression logistique ne gère pas les NaN : imputation médiane + scaling
    return Pipeline(
        [
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
            ("clf", LogisticRegression(random_state=seed, **params)),
        ]
    )


def _make_constant(params: dict[str, Any], seed: int):
    return ConstantClassifier(value=params.get("value", 0.5))


class EnsembleAverage(BaseEstimator, ClassifierMixin):
    """Moyenne des probabilités de plusieurs modèles (LightGBM + HistGB)."""

    def __init__(self, members: list):
        self.members = members

    def fit(self, X, y):
        for m in self.members:
            m.fit(X, y)
        self.classes_ = np.array([0, 1])
        return self

    def predict_proba(self, X):
        probas = np.mean([m.predict_proba(X) for m in self.members], axis=0)
        return probas

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)


def _make_ensemble(params: dict[str, Any], seed: int):
    from .config import DEFAULT_PARAMS

    members = [_make_histgb(dict(DEFAULT_PARAMS["histgb"]), seed)]
    if HAS_LIGHTGBM:
        members.insert(0, _make_lightgbm(dict(DEFAULT_PARAMS["lightgbm"]), seed))
    else:
        members.append(_make_logreg(dict(DEFAULT_PARAMS["logreg"]), seed))
    return EnsembleAverage(members)


REGISTRY = {
    "histgb": _make_histgb,
    "lightgbm": _make_lightgbm,
    "logreg": _make_logreg,
    "constant": _make_constant,
    "ensemble": _make_ensemble,
}


def available_models() -> list[str]:
    models = ["histgb", "logreg", "constant", "ensemble"]
    if HAS_LIGHTGBM:
        models.insert(0, "lightgbm")
    return models


def make_model(name: str, params: dict[str, Any], seed: int):
    if name not in REGISTRY:
        raise ValueError(f"Modèle inconnu : {name} (disponibles : {list(REGISTRY)})")
    return REGISTRY[name](params, seed)
