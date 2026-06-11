"""Métriques d'évaluation — tout ce que le Labo ML affiche pour benchmarker."""

import numpy as np
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score


def brier_decomposition(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> dict:
    """Décomposition de Murphy : Brier = fiabilité (calibration) - résolution + incertitude.

    - reliability  : faible = bien calibré (à réduire)
    - resolution   : élevé = bon pouvoir discriminant (à augmenter)
    - uncertainty  : variance intrinsèque du label (incompressible)
    """
    bins = np.clip((p * n_bins).astype(int), 0, n_bins - 1)
    base_rate = y.mean()
    reliability = 0.0
    resolution = 0.0
    n = len(y)
    for b in range(n_bins):
        mask = bins == b
        nb = mask.sum()
        if nb == 0:
            continue
        ob = y[mask].mean()  # fréquence observée dans le bin
        pb = p[mask].mean()  # probabilité moyenne prédite dans le bin
        reliability += nb / n * (pb - ob) ** 2
        resolution += nb / n * (ob - base_rate) ** 2
    uncertainty = base_rate * (1 - base_rate)
    return {
        "reliability": float(reliability),
        "resolution": float(resolution),
        "uncertainty": float(uncertainty),
    }


def expected_calibration_error(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> float:
    bins = np.clip((p * n_bins).astype(int), 0, n_bins - 1)
    n = len(y)
    ece = 0.0
    for b in range(n_bins):
        mask = bins == b
        nb = mask.sum()
        if nb == 0:
            continue
        ece += nb / n * abs(y[mask].mean() - p[mask].mean())
    return float(ece)


def calibration_curve_bins(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> list[dict]:
    bins = np.clip((p * n_bins).astype(int), 0, n_bins - 1)
    curve = []
    for b in range(n_bins):
        mask = bins == b
        nb = int(mask.sum())
        curve.append(
            {
                "bin": b,
                "p_moyen": float(p[mask].mean()) if nb else None,
                "freq_observee": float(y[mask].mean()) if nb else None,
                "effectif": nb,
            }
        )
    return curve


def prediction_histogram(y: np.ndarray, p: np.ndarray, n_bins: int = 20) -> list[dict]:
    edges = np.linspace(0, 1, n_bins + 1)
    h0, _ = np.histogram(p[y == 0], bins=edges)
    h1, _ = np.histogram(p[y == 1], bins=edges)
    return [
        {
            "bin_min": float(edges[i]),
            "bin_max": float(edges[i + 1]),
            "sains": int(h0[i]),
            "corrodes": int(h1[i]),
        }
        for i in range(n_bins)
    ]


def compute_all_metrics(y: np.ndarray, p: np.ndarray) -> dict:
    y = np.asarray(y, dtype=float)
    p = np.clip(np.asarray(p, dtype=float), 1e-7, 1 - 1e-7)
    decomp = brier_decomposition(y, p)
    return {
        "brier": float(brier_score_loss(y, p)),
        "log_loss": float(log_loss(y, p)),
        "auc": float(roc_auc_score(y, p)) if len(np.unique(y)) > 1 else None,
        "ece": expected_calibration_error(y, p),
        "brier_decomposition": decomp,
        "calibration_curve": calibration_curve_bins(y, p),
        "prediction_histogram": prediction_histogram(y, p),
        "brier_baseline_constant": float(brier_score_loss(y, np.full(len(y), 0.5))),
        "brier_baseline_prevalence": float(
            brier_score_loss(y, np.full(len(y), y.mean()))
        ),
    }
