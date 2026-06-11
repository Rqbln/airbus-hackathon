"""Accès aux artefacts ML pour l'API (run actif, prédictions, features)."""

from functools import lru_cache

import pandas as pd
from corrotwin_ml import dataset, runs
from corrotwin_ml.predict import load_test_predictions
from fastapi import HTTPException

HIGH_THRESHOLD = 0.75
MEDIUM_THRESHOLD = 0.40


def tier_of(risk: float) -> str:
    if risk >= HIGH_THRESHOLD:
        return "eleve"
    if risk >= MEDIUM_THRESHOLD:
        return "moyen"
    return "faible"


def active_run_id() -> str:
    run_id = runs.get_active()
    if run_id is None:
        raise HTTPException(
            status_code=409,
            detail="Aucun run actif — entraîner un modèle depuis le Labo ML",
        )
    return run_id


@lru_cache(maxsize=4)
def _predictions_cached(run_id: str) -> pd.DataFrame:
    return load_test_predictions(run_id)


def predictions(run_id: str) -> pd.DataFrame:
    try:
        return _predictions_cached(run_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@lru_cache(maxsize=1)
def test_features() -> pd.DataFrame:
    cols = [
        "aircraft_id",
        "year_month",
        "corrosivity_increment",
        "corrosivity_increment_cum",
        "metar_relative_humidity",
        "chloride",
        "sulphur_dioxide_mass_mixing_ratio",
        "parking_hours",
    ]
    df = dataset.build_test_features()
    return df[cols].copy()
