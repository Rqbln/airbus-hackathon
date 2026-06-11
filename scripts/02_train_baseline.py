"""Phase 2 - Baseline LightGBM (features brutes mois courant uniquement).
Reprend la logique de 02_baseline.py racine en utilisant le package corrosion.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import numpy as np
import pandas as pd
from corrosion import config as C, data, target, models, validation, calibration, submission, reporting


def main():
    print("[1] Load")
    corr = data.load_corrosions()
    env_train = data.load_environment("train")
    env_test = data.load_environment("test")
    sample = data.load_sample_submission()

    print("[2] Build training set (strict)")
    pairs = target.build_training_pairs(corr)
    merged = pairs.merge(env_train, on=['aircraft_id', 'year_month'], how='inner')
    train_df = target.keep_complete_pairs(merged)
    feature_cols = C.RAW_FEATURE_COLS
    X = train_df[feature_cols]
    y = train_df['target'].values
    groups = train_df['aircraft_id'].values
    print(f"  train shape: {X.shape}, classes: {dict(pd.Series(y).value_counts())}")

    print("[3] CV LightGBM (raw features)")
    factory = lambda: models.make_lightgbm(n_estimators=400)
    oof, fold_scores = validation.cv_oof(factory, X, y, groups)
    summary = validation.summarize_scores(fold_scores)
    print(f"  OOF Brier mean={summary['brier_mean']:.4f} std={summary['brier_std']:.4f} "
          f"AUC mean={summary['auc_mean']:.4f}")

    print("[4] Calibrated fit on full train")
    base = models.make_lightgbm(n_estimators=400)
    cal = calibration.make_calibrated(base, method='sigmoid', cv=5)
    cal.fit(X, y)

    print("[5] Predict test + submission")
    X_test = env_test[feature_cols]
    env_test = env_test.copy()
    env_test['pred'] = cal.predict_proba(X_test)[:, 1]
    sub = submission.build_submission(env_test, sample, pred_col='pred')
    path = submission.save_submission(sub, "submission_baseline.csv")
    print(f"  saved: {path}")
    print(f"  preds: min={sub[C.TARGET_COL].min():.3f} mean={sub[C.TARGET_COL].mean():.3f} "
          f"max={sub[C.TARGET_COL].max():.3f}")

    # Reports
    reporting.write_json({
        "model": "lightgbm_baseline",
        "features": "raw_only_current_month",
        "n_train_rows": int(len(X)),
        "n_features": int(X.shape[1]),
        "n_aircraft_train": int(train_df['aircraft_id'].nunique()),
        "cv": summary,
    }, "baseline_metrics.json")
    reporting.write_csv(pd.DataFrame(fold_scores), "baseline_fold_scores.csv")


if __name__ == "__main__":
    main()
