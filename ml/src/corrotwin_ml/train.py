from __future__ import annotations

import time
from copy import deepcopy

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.inspection import permutation_importance
from sklearn.model_selection import GroupKFold

from .config import ExperimentConfig
from .features import engineer_features, select_feature_matrix
from .metrics import compute_metrics
from .models import create_estimator, predict_proba_positive, resolve_model_name
from .runs import create_run_dir, get_active_run_id, list_runs, save_run
from .targets import build_training_frame
from .tuning import random_search_params


def _feature_importance(estimator, X: pd.DataFrame, y: np.ndarray, feature_names: list[str]) -> list[dict]:
    imp: list[dict] = []
    base = estimator
    if hasattr(estimator, "calibrated_classifiers_"):
        base = estimator.calibrated_classifiers_[0].estimator
    if hasattr(base, "feature_importances_"):
        for name, val in zip(feature_names, base.feature_importances_):
            imp.append({"feature": name, "gain": float(val), "permutation": None})
    try:
        perm = permutation_importance(
            estimator,
            X,
            y,
            n_repeats=3,
            random_state=42,
            scoring="neg_brier_score",
        )
        perm_map = {n: float(v) for n, v in zip(feature_names, perm.importances_mean)}
        if imp:
            for row in imp:
                row["permutation"] = perm_map.get(row["feature"])
        else:
            imp = [
                {"feature": n, "gain": None, "permutation": perm_map[n]}
                for n in sorted(perm_map, key=perm_map.get, reverse=True)  # type: ignore[arg-type]
            ]
    except Exception:
        pass
    imp.sort(key=lambda r: (r.get("permutation") or r.get("gain") or 0), reverse=True)
    return imp[:30]


def run_experiment(config: ExperimentConfig, run_dir=None) -> dict:
    t0 = time.time()
    config = deepcopy(config)
    config.model_name = resolve_model_name(config.model_name)
    run_dir = run_dir or create_run_dir(config)

    train_df = build_training_frame(
        offset_months=config.offset_months,
        drop_missing_env=config.drop_missing_env,
    )
    feat_df = engineer_features(train_df, feature_set=config.feature_set)
    X, feature_names = select_feature_matrix(feat_df, feature_set=config.feature_set)
    y = feat_df["y"].astype(int).values
    groups = feat_df["aircraft_id"].values

    if config.tune and config.model_name in ("lightgbm", "histgb"):
        best_params = random_search_params(X, y, groups, config)
        config.n_estimators = best_params.get("n_estimators", config.n_estimators)
        config.max_depth = best_params.get("max_depth", config.max_depth)
        config.learning_rate = best_params.get("learning_rate", config.learning_rate)

    gkf = GroupKFold(n_splits=config.n_splits)
    cv_splits = list(gkf.split(X, y, groups))
    oof = np.zeros(len(y), dtype=float)
    fold_metrics = []

    for fold_idx, (tr, va) in enumerate(cv_splits):
        est = create_estimator(config)
        if config.calibration != "none" and config.model_name != "constant":
            est = CalibratedClassifierCV(est, method=config.calibration, cv=3)
        est.fit(X.iloc[tr], y[tr])
        oof[va] = predict_proba_positive(est, X.iloc[va])
        fm = compute_metrics(y[va], oof[va])
        fm["fold"] = fold_idx
        fold_metrics.append(fm)

    # modèle final sur tout le jeu (splits pré-calculés pour GroupKFold + calibration)
    final_est = create_estimator(config)
    if config.calibration != "none" and config.model_name != "constant":
        final_est = CalibratedClassifierCV(
            final_est,
            method=config.calibration,
            cv=cv_splits,
        )
        final_est.fit(X, y)
    else:
        final_est.fit(X, y)

    metrics = compute_metrics(y, oof)
    fold_briers = [f["brier"] for f in fold_metrics]
    metrics["fold_brier"] = fold_briers
    metrics["fold_brier_mean"] = float(np.mean(fold_briers))
    metrics["fold_brier_std"] = float(np.std(fold_briers))
    metrics["feature_importance"] = _feature_importance(final_est, X, y, feature_names)
    metrics["n_samples"] = int(len(y))
    metrics["n_features"] = len(feature_names)
    metrics["duration_seconds"] = round(time.time() - t0, 2)
    metrics["resolved_model"] = config.model_name

    prev_runs = [r for r in list_runs() if r["metrics"].get("status") == "done"]
    if prev_runs:
        best_prev = min(prev_runs, key=lambda r: r["metrics"].get("brier", 1.0))
        metrics["delta_vs_best_run"] = float(best_prev["metrics"]["brier"] - metrics["brier"])
        metrics["best_run_id_before"] = best_prev["run_id"]
    else:
        metrics["delta_vs_best_run"] = None
        metrics["best_run_id_before"] = None

    oof_df = feat_df[["aircraft_id", "year_month", "y"]].copy()
    oof_df["oof_prob"] = oof

    run_id = save_run(
        run_dir,
        config,
        metrics,
        final_est,
        feature_names,
        oof_df=oof_df,
        status="done",
    )

    if get_active_run_id() is None or metrics["brier"] < 0.25:
        from .runs import set_active_run

        set_active_run(run_id)

    return {"run_id": run_id, "metrics": metrics, "config": config.model_dump()}
