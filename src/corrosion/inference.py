"""Inference / generation de predictions sur le test."""
from __future__ import annotations
import numpy as np
import pandas as pd


def predict_proba_clipped(model, X, eps=1e-4) -> np.ndarray:
    p = model.predict_proba(X)[:, 1]
    return np.clip(p, eps, 1 - eps)


def predict_ensemble(models_with_weights, X) -> np.ndarray:
    """models_with_weights: list of (model, weight). Retourne moyenne ponderee."""
    total_w = sum(w for _, w in models_with_weights)
    out = np.zeros(len(X))
    for model, w in models_with_weights:
        out += (w / total_w) * predict_proba_clipped(model, X)
    return out
