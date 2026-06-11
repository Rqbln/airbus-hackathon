"""Phase 3 - Feature engineering avance + entrainement multi-modeles.
- Construit toutes les features (age, cumul, rolling, interactions)
- Compare LightGBM, XGBoost, CatBoost, HistGB, LogReg
- Compare calibrations (raw, sigmoid, isotonic)
- Sauvegarde la meilleure submission individuelle
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import json
import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, roc_auc_score
from corrosion import (
    config as C, data, target, features as feat, models, validation,
    calibration as calib, submission, reporting,
)


def evaluate_model(name: str, factory, X, y, groups, env_test_fe, sample, feature_cols):
    print(f"\n--- {name} ---")
    oof, fold_scores = validation.cv_oof(factory, X, y, groups)
    summary = validation.summarize_scores(fold_scores)
    print(f"  OOF Brier {summary['brier_mean']:.4f} (+/-{summary['brier_std']:.4f})  "
          f"AUC {summary['auc_mean']:.4f}")

    # Fit final sur tout le train, sans calibration
    model = factory()
    model.fit(X, y)
    X_test = env_test_fe[feature_cols]
    preds_raw = model.predict_proba(X_test)[:, 1]

    return {
        'name': name,
        'oof': oof,
        'fold_scores': fold_scores,
        'summary': summary,
        'test_preds_raw': preds_raw,
        'model': model,
    }


def main():
    print("[1] Load")
    corr = data.load_corrosions()
    env_train = data.load_environment("train")
    env_test = data.load_environment("test")
    sample = data.load_sample_submission()
    delivery = data.load_delivery_dates()
    print(f"  delivery dates: {len(delivery)} avions")

    print("[2] Feature engineering (cumul / rolling / age / interactions)")
    env_train_fe, env_test_fe = feat.build_full_features(env_train, env_test, delivery)
    feature_cols = feat.get_feature_columns(env_train_fe)
    print(f"  features: {len(feature_cols)}")

    print("[3] Construction training set (strict)")
    pairs = target.build_training_pairs(corr)
    train_df = pairs.merge(env_train_fe, on=['aircraft_id', 'year_month'], how='inner')
    train_df = target.keep_complete_pairs(train_df)
    X = train_df[feature_cols]
    y = train_df['target'].values
    groups = train_df['aircraft_id'].values
    print(f"  train shape: {X.shape}")

    print("[4] Evaluation multi-modeles")
    results = {}
    for name in ['lightgbm', 'xgboost', 'catboost', 'histgb', 'logreg']:
        try:
            factory = models.MODEL_FACTORIES[name]
            r = evaluate_model(name, factory, X, y, groups, env_test_fe, sample, feature_cols)
            results[name] = r
        except Exception as e:
            print(f"  /!\\ {name} failed: {e}")

    print("\n[5] Selection meilleur modele + calibration")
    best_name = min(results, key=lambda k: results[k]['summary']['brier_mean'])
    print(f"  meilleur (Brier OOF): {best_name} = {results[best_name]['summary']['brier_mean']:.4f}")

    # Calibrations testees uniquement sur le meilleur
    print(f"\n[6] Comparaison calibrations sur {best_name}")
    factory = models.MODEL_FACTORIES[best_name]
    cal_results = {}
    for method in ['raw', 'sigmoid', 'isotonic']:
        if method == 'raw':
            f = factory
        else:
            f = (lambda m=method: calib.make_calibrated(factory(), method=m, cv=5))
        try:
            oof, fold_scores = validation.cv_oof(f, X, y, groups, verbose=False)
            s = validation.summarize_scores(fold_scores)
            cal_results[method] = s
            print(f"  {method:9s}: Brier {s['brier_mean']:.4f} (+/-{s['brier_std']:.4f})")
        except Exception as e:
            print(f"  {method:9s}: FAIL ({e})")

    best_cal = min(cal_results, key=lambda k: cal_results[k]['brier_mean'])
    print(f"  -> calibration retenue: {best_cal}")

    print("\n[7] Fit final + submission feature engineering")
    if best_cal == 'raw':
        final_model = factory()
    else:
        final_model = calib.make_calibrated(factory(), method=best_cal, cv=5)
    final_model.fit(X, y)

    env_test_fe = env_test_fe.copy()
    env_test_fe['pred'] = final_model.predict_proba(env_test_fe[feature_cols])[:, 1]
    sub = submission.build_submission(env_test_fe, sample, pred_col='pred')
    path = submission.save_submission(sub, "submission_fe_v1.csv")
    print(f"  saved: {path}")

    # Aussi submission "best_model" sans calibration externe pour comparer
    if best_cal != 'raw':
        raw_model = factory()
        raw_model.fit(X, y)
        env_test_fe['pred_raw'] = raw_model.predict_proba(env_test_fe[feature_cols])[:, 1]
        sub_raw = submission.build_submission(env_test_fe, sample, pred_col='pred_raw')
        submission.save_submission(sub_raw, "submission_best_model_raw.csv")

    print("\n[8] Reports")
    # model_metrics.json: comparatif tous modeles
    metrics = {
        'features': {
            'total': len(feature_cols),
            'list': feature_cols,
        },
        'n_train_rows': int(len(X)),
        'n_aircraft_train': int(train_df['aircraft_id'].nunique()),
        'models': {
            name: {
                'cv': r['summary'],
                'fold_scores': r['fold_scores'],
            } for name, r in results.items()
        },
        'best_model': best_name,
        'best_calibration': best_cal,
        'calibration_results': cal_results,
    }
    reporting.write_json(metrics, "fe_v1_metrics.json")

    # Feature importance du meilleur GBM
    fi_path = None
    try:
        m = results[best_name]['model']
        if hasattr(m, 'feature_importances_'):
            fi = pd.DataFrame({
                'feature': feature_cols,
                'importance': m.feature_importances_,
            }).sort_values('importance', ascending=False)
            fi_path = reporting.write_csv(fi, "feature_importance_fe.csv")
    except Exception as e:
        print(f"  importance fail: {e}")
    if fi_path:
        print(f"  feature importance: {fi_path}")

    # Fold scores
    rows = []
    for name, r in results.items():
        for fs in r['fold_scores']:
            rows.append({'model': name, **fs})
    reporting.write_csv(pd.DataFrame(rows), "fe_v1_fold_scores.csv")

    print("\n[DONE]")
    return results, env_test_fe


if __name__ == "__main__":
    main()
