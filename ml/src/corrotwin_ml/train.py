"""Entraînement + validation OOF d'une expérience.

Protocole (anti-leakage strict) :
1. GroupKFold par aircraft_id : un avion n'est jamais à la fois en train et
   en validation (les deux lignes d'un avion restent ensemble).
2. Prédictions out-of-fold brutes sur chaque fold.
3. Calibration en OOF croisé : le calibrateur appliqué au fold f est ajusté
   uniquement sur les prédictions OOF des autres folds.
4. Métriques complètes calculées sur les prédictions OOF calibrées.
5. Modèle final réentraîné sur toutes les données + calibrateur final ajusté
   sur l'ensemble des prédictions OOF brutes -> utilisé pour l'inférence.
"""

import time

import joblib
import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from sklearn.model_selection import GroupKFold

from . import dataset, metrics, paths, runs
from .calibration import Calibrator
from .config import ExperimentConfig
from .features import select_feature_columns
from .models import make_model


def run_experiment(config: ExperimentConfig, run_id: str | None = None) -> str:
    """Exécute un run complet et persiste tous les artefacts. Retourne le run_id."""
    if run_id is None:
        run_id = runs.init_run(config)
    runs.set_status(run_id, "running")
    try:
        _run(config, run_id)
        runs.set_status(run_id, "done")
        runs.maybe_activate(run_id)
    except Exception as exc:  # surface l'erreur dans status.json pour le frontend
        runs.set_status(run_id, "failed", error=f"{type(exc).__name__}: {exc}")
        raise
    return run_id


def _run(config: ExperimentConfig, run_id: str) -> None:
    t0 = time.time()
    rd = runs.run_dir(run_id)

    train_mat = dataset.build_train_matrix()
    test_feat = dataset.build_test_features()

    feature_cols = select_feature_columns(train_mat, test_feat, config.feature_set)
    X = train_mat[feature_cols]
    y = train_mat["y"].astype(int).to_numpy()
    groups = train_mat["aircraft_id"].to_numpy()

    # --- 1-2. OOF brut par GroupKFold ---
    gkf = GroupKFold(n_splits=config.n_splits)
    oof_raw = np.full(len(y), np.nan)
    fold_ids = np.full(len(y), -1)
    fold_models = []
    for fold, (tr_idx, va_idx) in enumerate(gkf.split(X, y, groups)):
        model = make_model(config.model, config.resolved_params(), config.seed)
        model.fit(X.iloc[tr_idx], y[tr_idx])
        oof_raw[va_idx] = model.predict_proba(X.iloc[va_idx])[:, 1]
        fold_ids[va_idx] = fold
        fold_models.append((model, va_idx))

    # --- 3. Calibration en OOF croisé ---
    if config.calibration != "none":
        oof_cal = np.full(len(y), np.nan)
        for fold in range(config.n_splits):
            mask = fold_ids == fold
            calib = Calibrator(config.calibration).fit(oof_raw[~mask], y[~mask])
            oof_cal[mask] = calib.transform(oof_raw[mask])
    else:
        oof_cal = oof_raw.copy()
    oof_cal = np.clip(oof_cal, 0.0, 1.0)

    # --- 4. Métriques complètes ---
    all_metrics = metrics.compute_all_metrics(y, oof_cal)
    all_metrics["brier_uncalibrated"] = metrics.compute_all_metrics(y, oof_raw)["brier"]

    briers_per_fold = [
        float(np.mean((oof_cal[fold_ids == f] - y[fold_ids == f]) ** 2))
        for f in range(config.n_splits)
    ]
    all_metrics["brier_per_fold"] = briers_per_fold
    all_metrics["brier_per_fold_mean"] = float(np.mean(briers_per_fold))
    all_metrics["brier_per_fold_std"] = float(np.std(briers_per_fold))

    # Importance par permutation (sur folds de validation, scoring Brier) +
    # importance native (gain) quand le modèle l'expose
    all_metrics["permutation_importance"] = _permutation_importances(
        fold_models, X, y, feature_cols, config
    )
    all_metrics["gain_importance"] = _gain_importances(fold_models, feature_cols)

    all_metrics["n_features"] = len(feature_cols)
    all_metrics["feature_columns"] = feature_cols
    all_metrics["n_rows"] = int(len(y))
    all_metrics["n_aircraft"] = int(pd.Series(groups).nunique())

    # --- 5. Modèle final pour l'inférence ---
    final_model = make_model(config.model, config.resolved_params(), config.seed)
    final_model.fit(X, y)
    final_calibrator = Calibrator(config.calibration).fit(oof_raw, y)

    # Prédictions flotte test (toutes les lignes aircraft x mois)
    p_test_raw = final_model.predict_proba(test_feat[feature_cols])[:, 1]
    p_test = np.clip(final_calibrator.transform(p_test_raw), 0.0, 1.0)
    test_pred = pd.DataFrame(
        {
            "aircraft_id": test_feat["aircraft_id"],
            "year_month": test_feat["year_month"],
            "corrosion_risk": p_test,
        }
    )

    all_metrics["duration_seconds"] = round(time.time() - t0, 2)

    # --- Persistance ---
    runs.save_metrics(run_id, all_metrics)
    joblib.dump(
        {
            "model": final_model,
            "calibrator": final_calibrator,
            "feature_columns": feature_cols,
            "config": config.model_dump(),
        },
        rd / "model.joblib",
    )
    pd.DataFrame(
        {
            "aircraft_id": train_mat["aircraft_id"],
            "year_month": train_mat["year_month"],
            "y": y,
            "fold": fold_ids,
            "p_raw": oof_raw,
            "p_calibrated": oof_cal,
        }
    ).to_csv(rd / "oof.csv", index=False)
    test_pred.to_csv(rd / "test_predictions.csv", index=False)


def _permutation_importances(fold_models, X, y, feature_cols, config) -> list[dict]:
    """Moyenne des importances par permutation sur les folds de validation."""
    if config.model == "constant":
        return []
    acc = np.zeros(len(feature_cols))
    for model, va_idx in fold_models:
        perm = permutation_importance(
            model,
            X.iloc[va_idx],
            y[va_idx],
            scoring="neg_brier_score",
            n_repeats=5,
            random_state=config.seed,
        )
        acc += perm.importances_mean
    acc /= len(fold_models)
    order = np.argsort(acc)[::-1]
    return [
        {"feature": feature_cols[i], "importance": float(acc[i])}
        for i in order[:30]
    ]


def _gain_importances(fold_models, feature_cols) -> list[dict]:
    """Importance native (gain) moyenne des folds, si le modèle l'expose."""
    importances = []
    for model, _ in fold_models:
        raw = getattr(model, "feature_importances_", None)
        if raw is None:
            return []
        raw = np.asarray(raw, dtype=float)
        total = raw.sum()
        importances.append(raw / total if total > 0 else raw)
    mean_imp = np.mean(importances, axis=0)
    order = np.argsort(mean_imp)[::-1]
    return [
        {"feature": feature_cols[i], "importance": float(mean_imp[i])}
        for i in order[:30]
    ]
