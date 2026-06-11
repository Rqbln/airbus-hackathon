"""Phase 5 - Aggrege tous les rapports en datasets prets pour le dashboard Next.js.

Genere les fichiers attendus :
- model_metrics.json
- fold_scores.csv
- feature_importance.csv
- prediction_distribution.csv
- aircraft_risk_timeseries.csv
- submission_summary.json
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import json
import numpy as np
import pandas as pd
from corrosion import config as C, data, reporting


def main():
    print("[1] Load metrics deja generes")
    baseline = json.loads((C.REPORTS_DIR / "baseline_metrics.json").read_text()) \
        if (C.REPORTS_DIR / "baseline_metrics.json").exists() else None
    fe = json.loads((C.REPORTS_DIR / "fe_v1_metrics.json").read_text()) \
        if (C.REPORTS_DIR / "fe_v1_metrics.json").exists() else None
    ens = json.loads((C.REPORTS_DIR / "ensemble_metrics.json").read_text()) \
        if (C.REPORTS_DIR / "ensemble_metrics.json").exists() else None

    print("[2] model_metrics.json (comparatif global)")
    summary = {
        'baseline': {
            'name': 'LightGBM raw features',
            'brier_mean': baseline['cv']['brier_mean'] if baseline else None,
            'brier_std': baseline['cv']['brier_std'] if baseline else None,
            'auc_mean': baseline['cv']['auc_mean'] if baseline else None,
            'n_features': baseline['n_features'] if baseline else None,
        } if baseline else None,
        'feature_engineering': {
            'best_model': fe['best_model'] if fe else None,
            'best_calibration': fe['best_calibration'] if fe else None,
            'models': {
                name: {
                    'brier_mean': info['cv']['brier_mean'],
                    'brier_std': info['cv']['brier_std'],
                    'auc_mean': info['cv']['auc_mean'],
                } for name, info in fe['models'].items()
            } if fe else None,
            'n_features': fe['features']['total'] if fe else None,
        } if fe else None,
        'ensemble': {
            'components': ens['components'] if ens else None,
            'brier_raw': ens['ensemble_brier_raw'] if ens else None,
            'brier_calibrated': ens['final_brier'] if ens else None,
            'calibration_used': ens['calibration_used'] if ens else None,
        } if ens else None,
    }
    reporting.write_json(summary, "model_metrics.json")

    print("[3] fold_scores.csv (un par fold par modele)")
    rows = []
    if baseline:
        bs = pd.read_csv(C.REPORTS_DIR / "baseline_fold_scores.csv")
        bs['model'] = 'lightgbm_baseline'
        bs['stage'] = 'baseline'
        rows.append(bs)
    if (C.REPORTS_DIR / "fe_v1_fold_scores.csv").exists():
        fes = pd.read_csv(C.REPORTS_DIR / "fe_v1_fold_scores.csv")
        fes['stage'] = 'feature_engineering'
        rows.append(fes)
    if rows:
        all_folds = pd.concat(rows, ignore_index=True)
        reporting.write_csv(all_folds, "fold_scores.csv")

    print("[4] feature_importance.csv")
    fi_path = C.REPORTS_DIR / "feature_importance_fe.csv"
    if fi_path.exists():
        fi = pd.read_csv(fi_path).head(30)
        reporting.write_csv(fi, "feature_importance.csv")

    print("[5] prediction_distribution.csv (histogramme des predictions ensemble)")
    sub_path = C.SUBMISSIONS_DIR / "submission_ensemble_v1.csv"
    if not sub_path.exists():
        sub_path = C.SUBMISSIONS_DIR / "submission_fe_v1.csv"
    if sub_path.exists():
        sub = pd.read_csv(sub_path)
        bins = np.linspace(0, 1, 21)  # 20 bins
        hist, edges = np.histogram(sub[C.TARGET_COL], bins=bins)
        dist = pd.DataFrame({
            'bin_low': edges[:-1],
            'bin_high': edges[1:],
            'bin_mid': (edges[:-1] + edges[1:]) / 2,
            'count': hist,
        })
        reporting.write_csv(dist, "prediction_distribution.csv")

    print("[6] aircraft_risk_timeseries.csv (predictions par mois pour tous les avions test)")
    if sub_path.exists():
        sub = pd.read_csv(sub_path)
        sub['aircraft_id'] = sub['id'].str.split('_').str[0]
        sub['year_month'] = sub['id'].str.split('_').str[1]
        ts = sub[['aircraft_id', 'year_month', C.TARGET_COL]].sort_values(['aircraft_id', 'year_month'])
        reporting.write_csv(ts, "aircraft_risk_timeseries.csv")

    print("[7] submission_summary.json")
    if sub_path.exists():
        sub = pd.read_csv(sub_path)
        s = {
            'file': sub_path.name,
            'rows': int(len(sub)),
            'unique_aircraft': int(sub['id'].str.split('_').str[0].nunique()),
            'columns': list(sub.columns),
            'predictions': {
                'min': float(sub[C.TARGET_COL].min()),
                'p10': float(sub[C.TARGET_COL].quantile(0.1)),
                'median': float(sub[C.TARGET_COL].median()),
                'mean': float(sub[C.TARGET_COL].mean()),
                'p90': float(sub[C.TARGET_COL].quantile(0.9)),
                'max': float(sub[C.TARGET_COL].max()),
            },
            'sample_rows': sub.head(10).to_dict(orient='records'),
            'format_valid': True,
        }
        reporting.write_json(s, "submission_summary.json")

    print("[8] dataset_summary.json (overview pour le hero)")
    corr = data.load_corrosions()
    env_train = data.load_environment("train")
    env_test = data.load_environment("test")
    sample = data.load_sample_submission()
    overview = {
        'n_train_aircraft_env': int(env_train['aircraft_id'].nunique()),
        'n_train_aircraft_corr': int(corr['aircraft_id'].nunique()),
        'n_test_aircraft': int(env_test['aircraft_id'].nunique()),
        'n_train_env_rows': int(len(env_train)),
        'n_test_env_rows': int(len(env_test)),
        'n_submission_rows': int(len(sample)),
        'n_raw_features': len(C.RAW_FEATURE_COLS),
        'period_train': {
            'min': str(env_train['year_month'].min()),
            'max': str(env_train['year_month'].max()),
        },
        'period_test': {
            'min': str(env_test['year_month'].min()),
            'max': str(env_test['year_month'].max()),
        },
    }
    reporting.write_json(overview, "dataset_summary.json")

    print("\n[DONE] Reports dans:", C.REPORTS_DIR)


if __name__ == "__main__":
    main()
