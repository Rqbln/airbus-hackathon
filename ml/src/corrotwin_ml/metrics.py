from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    brier_score_loss,
    log_loss,
    roc_auc_score,
)


def expected_calibration_error(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (y_prob >= bins[i]) & (y_prob < bins[i + 1] if i < n_bins - 1 else y_prob <= bins[i + 1])
        if not mask.any():
            continue
        acc = y_true[mask].mean()
        conf = y_prob[mask].mean()
        ece += mask.mean() * abs(acc - conf)
    return float(ece)


def calibration_curve_bins(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> list[dict]:
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    out = []
    for i in range(n_bins):
        lo, hi = bins[i], bins[i + 1]
        if i < n_bins - 1:
            mask = (y_prob >= lo) & (y_prob < hi)
        else:
            mask = (y_prob >= lo) & (y_prob <= hi)
        if not mask.any():
            out.append({"bin": i, "lo": float(lo), "hi": float(hi), "mean_pred": None, "frac_pos": None, "count": 0})
            continue
        out.append(
            {
                "bin": i,
                "lo": float(lo),
                "hi": float(hi),
                "mean_pred": float(y_prob[mask].mean()),
                "frac_pos": float(y_true[mask].mean()),
                "count": int(mask.sum()),
            }
        )
    return out


def brier_decomposition(y_true: np.ndarray, y_prob: np.ndarray) -> dict:
    """Décomposition Murphy : reliability (calibration) + resolution + uncertainty."""
    y_true = y_true.astype(float)
    y_prob = np.clip(y_prob, 0.0, 1.0)
    base_rate = y_true.mean()
    uncertainty = base_rate * (1 - base_rate)
    n_bins = 10
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    reliability = 0.0
    resolution = 0.0
    for i in range(n_bins):
        lo, hi = bins[i], bins[i + 1]
        mask = (y_prob >= lo) & (y_prob < hi if i < n_bins - 1 else y_prob <= hi)
        if not mask.any():
            continue
        nk = mask.mean()
        pk = y_prob[mask].mean()
        yk = y_true[mask].mean()
        reliability += nk * (pk - yk) ** 2
        resolution += nk * (yk - base_rate) ** 2
    return {
        "brier": float(brier_score_loss(y_true, y_prob)),
        "reliability": float(reliability),
        "resolution": float(resolution),
        "uncertainty": float(uncertainty),
    }


def prediction_histogram(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 20) -> dict:
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    hist_pos, _ = np.histogram(y_prob[y_true == 1], bins=bins)
    hist_neg, _ = np.histogram(y_prob[y_true == 0], bins=bins)
    return {
        "bins": [float(b) for b in bins],
        "positive_counts": hist_pos.astype(int).tolist(),
        "negative_counts": hist_neg.astype(int).tolist(),
    }


def compute_metrics(y_true: np.ndarray, y_prob: np.ndarray) -> dict:
    y_prob = np.clip(y_prob, 1e-6, 1 - 1e-6)
    brier = float(brier_score_loss(y_true, y_prob))
    try:
        auc = float(roc_auc_score(y_true, y_prob))
    except ValueError:
        auc = None
    try:
        ll = float(log_loss(y_true, y_prob))
    except ValueError:
        ll = None
    decomp = brier_decomposition(y_true, y_prob)
    return {
        "brier": brier,
        "log_loss": ll,
        "roc_auc": auc,
        "ece": expected_calibration_error(y_true, y_prob),
        "brier_decomposition": decomp,
        "calibration_curve": calibration_curve_bins(y_true, y_prob),
        "prediction_histogram": prediction_histogram(y_true, y_prob),
        "delta_vs_baseline_025": float(0.25 - brier),
    }
