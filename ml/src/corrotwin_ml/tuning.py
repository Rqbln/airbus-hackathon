from __future__ import annotations

import numpy as np
from sklearn.model_selection import GroupKFold

from .config import ExperimentConfig
from .metrics import compute_metrics
from .models import create_estimator, predict_proba_positive


def random_search_params(X, y, groups, config: ExperimentConfig) -> dict:
    rng = np.random.default_rng(config.random_state)
    gkf = GroupKFold(n_splits=min(3, config.n_splits))
    candidates = []
    for _ in range(config.tune_iterations):
        params = {
            "n_estimators": int(rng.choice([100, 150, 200, 300])),
            "max_depth": int(rng.choice([4, 5, 6, 8])),
            "learning_rate": float(rng.choice([0.03, 0.05, 0.08, 0.1])),
        }
        oof = np.zeros(len(y), dtype=float)
        for tr, va in gkf.split(X, y, groups):
            cfg = config.model_copy(update=params)
            est = create_estimator(cfg)
            est.fit(X.iloc[tr], y[tr])
            oof[va] = predict_proba_positive(est, X.iloc[va])
        brier = compute_metrics(y, oof)["brier"]
        candidates.append((brier, params))
    candidates.sort(key=lambda x: x[0])
    return candidates[0][1]
