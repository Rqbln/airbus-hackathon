"""Inférence et génération de la soumission Kaggle."""

from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd

from . import data as raw_data
from . import paths, runs


def load_run_artifacts(run_id: str) -> dict:
    path = runs.run_dir(run_id) / "model.joblib"
    if not path.exists():
        raise FileNotFoundError(f"Pas de modèle pour le run {run_id}")
    return joblib.load(path)


def load_test_predictions(run_id: str) -> pd.DataFrame:
    path = runs.run_dir(run_id) / "test_predictions.csv"
    if not path.exists():
        raise FileNotFoundError(f"Pas de prédictions test pour le run {run_id}")
    return pd.read_csv(path)


def make_submission(run_id: str) -> Path:
    """Aligne les prédictions du run sur sample_submission.csv (ordre exact,
    valeurs dans [0,1]) et écrit le fichier dans data/submissions/."""
    paths.ensure_dirs()
    sample = raw_data.load_sample_submission()
    preds = load_test_predictions(run_id)
    preds = preds.assign(
        id=preds["aircraft_id"].astype(str) + "_" + preds["year_month"].astype(str)
    )

    merged = sample[["id"]].merge(
        preds[["id", "corrosion_risk"]], on="id", how="left"
    )
    n_missing = int(merged["corrosion_risk"].isna().sum())
    if n_missing:
        raise ValueError(
            f"{n_missing} lignes de sample_submission sans prédiction — "
            "vérifier l'alignement aircraft_id/year_month"
        )
    merged["corrosion_risk"] = merged["corrosion_risk"].clip(0.0, 1.0)

    if len(merged) != len(sample):
        raise ValueError("Le nombre de lignes ne correspond pas à sample_submission")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    config = runs.get_run(run_id)["config"]
    slug = f"{config['model']}_{config['feature_set']}_{config['calibration']}_cv{config['n_splits']}"
    out_path = paths.SUBMISSIONS / f"submission_{ts}_{slug}.csv"
    merged.to_csv(out_path, index=False)
    return out_path
