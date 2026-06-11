"""Phase 4 - Ensemble pondere des meilleurs modeles.
Strategie : poids inversement proportionnels au Brier OOF.
Sauvegarde submission_ensemble_v1.csv et reports associes.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import json
import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss
from corrosion import (
    config as C, data, target, features as feat, models, validation,
    calibration as calib, submission, reporting,
)


def main():
    print("[1] Load + features")
    corr = data.load_corrosions()
    env_train = data.load_environment("train")
    env_test = data.load_environment("test")
    sample = data.load_sample_submission()
    delivery = data.load_delivery_dates()
    env_train_fe, env_test_fe = feat.build_full_features(env_train, env_test, delivery)
    feature_cols = feat.get_feature_columns(env_train_fe)

    pairs = target.build_training_pairs(corr)
    train_df = pairs.merge(env_train_fe, on=['aircraft_id', 'year_month'], how='inner')
    train_df = target.keep_complete_pairs(train_df)
    X = train_df[feature_cols]
    y = train_df['target'].values
    groups = train_df['aircraft_id'].values
    X_test = env_test_fe[feature_cols]
    print(f"  train {X.shape}, test {X_test.shape}, features {len(feature_cols)}")

    print("[2] CV per modele")
    components = []
    base_models = ['lightgbm', 'xgboost', 'catboost', 'histgb']
    for name in base_models:
        try:
            factory = models.MODEL_FACTORIES[name]
            oof, fold_scores = validation.cv_oof(factory, X, y, groups, verbose=False)
            brier = brier_score_loss(y, oof)
            print(f"  {name:10s}: OOF Brier = {brier:.4f}")
            # Fit final
            model = factory()
            model.fit(X, y)
            test_preds = model.predict_proba(X_test)[:, 1]
            components.append({
                'name': name,
                'oof': oof,
                'brier': brier,
                'test_preds': test_preds,
                'fold_scores': fold_scores,
            })
        except Exception as e:
            print(f"  {name}: FAIL {e}")

    print("\n[3] Ensemble: moyenne ponderee 1/Brier")
    # Brier plus faible = meilleur => poids = 1 / brier
    weights = np.array([1.0 / c['brier'] for c in components])
    weights /= weights.sum()
    for c, w in zip(components, weights):
        print(f"  {c['name']:10s}: weight = {w:.4f}")

    # OOF ensemble
    ens_oof = sum(w * c['oof'] for w, c in zip(weights, components))
    ens_oof_brier = brier_score_loss(y, ens_oof)
    print(f"\n  OOF ENSEMBLE Brier = {ens_oof_brier:.4f}")
    best_single = min(c['brier'] for c in components)
    print(f"  meilleur single   = {best_single:.4f}")
    delta = best_single - ens_oof_brier
    print(f"  delta vs single   = {delta:+.4f}")

    # Predictions test
    ens_test = sum(w * c['test_preds'] for w, c in zip(weights, components))
    ens_test = np.clip(ens_test, 0.0, 1.0)

    print("\n[4] Calibration ensemble (Platt sur OOF)")
    # Calibration sigmoid sur les OOF preds pour reduire encore le Brier
    from sklearn.linear_model import LogisticRegression
    from sklearn.isotonic import IsotonicRegression
    # Sigmoid calibration
    lr = LogisticRegression(C=1e9)
    lr.fit(ens_oof.reshape(-1, 1), y)
    cal_sigmoid = lr.predict_proba(ens_oof.reshape(-1, 1))[:, 1]
    brier_sig = brier_score_loss(y, cal_sigmoid)
    # Isotonic
    iso = IsotonicRegression(out_of_bounds='clip')
    iso.fit(ens_oof, y)
    cal_iso = iso.transform(ens_oof)
    brier_iso = brier_score_loss(y, cal_iso)
    print(f"  raw      : {ens_oof_brier:.4f}")
    print(f"  sigmoid  : {brier_sig:.4f}")
    print(f"  isotonic : {brier_iso:.4f}")
    if brier_iso < brier_sig and brier_iso < ens_oof_brier:
        ens_test_cal = iso.transform(ens_test)
        cal_method = 'isotonic'
    elif brier_sig < ens_oof_brier:
        ens_test_cal = lr.predict_proba(ens_test.reshape(-1, 1))[:, 1]
        cal_method = 'sigmoid'
    else:
        ens_test_cal = ens_test
        cal_method = 'raw'
    print(f"  retenu   : {cal_method}")

    print("\n[5] Submission ensemble")
    env_out = env_test_fe.copy()
    env_out['pred'] = np.clip(ens_test_cal, 0.0, 1.0)
    sub = submission.build_submission(env_out, sample, pred_col='pred')
    path = submission.save_submission(sub, "submission_ensemble_v1.csv")
    print(f"  saved: {path}")

    print("\n[6] Reports")
    reporting.write_json({
        'components': [{
            'name': c['name'],
            'brier_oof': float(c['brier']),
            'weight': float(w),
        } for c, w in zip(components, weights)],
        'ensemble_brier_raw': float(ens_oof_brier),
        'ensemble_brier_sigmoid': float(brier_sig),
        'ensemble_brier_isotonic': float(brier_iso),
        'calibration_used': cal_method,
        'final_brier': float(min(ens_oof_brier, brier_sig, brier_iso)),
    }, "ensemble_metrics.json")

    # Submission summary
    sub_stats = {
        'submission_file': 'submission_ensemble_v1.csv',
        'rows': int(len(sub)),
        'min': float(sub[C.TARGET_COL].min()),
        'mean': float(sub[C.TARGET_COL].mean()),
        'median': float(sub[C.TARGET_COL].median()),
        'max': float(sub[C.TARGET_COL].max()),
    }
    reporting.write_json(sub_stats, "submission_summary.json")
    print("\n[DONE]")


if __name__ == "__main__":
    main()
