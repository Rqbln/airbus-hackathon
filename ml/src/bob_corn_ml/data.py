"""Chargement et validation des CSV bruts du challenge."""

import pandas as pd

from . import paths


def load_environment_training() -> pd.DataFrame:
    df = pd.read_csv(paths.ENV_TRAIN_CSV, parse_dates=["month_start_date"])
    _validate_env(df, "environment_training")
    return df


def load_environment_test() -> pd.DataFrame:
    df = pd.read_csv(paths.ENV_TEST_CSV, parse_dates=["month_start_date"])
    _validate_env(df, "environment_test")
    return df


def load_corrosions() -> pd.DataFrame:
    return pd.read_csv(paths.CORROSIONS_CSV, parse_dates=["observation_date"])


def load_sample_submission() -> pd.DataFrame:
    return pd.read_csv(paths.SAMPLE_SUBMISSION_CSV)


def _validate_env(df: pd.DataFrame, name: str) -> None:
    dupes = df.duplicated(subset=["aircraft_id", "year_month"]).sum()
    if dupes:
        raise ValueError(f"{name}: {dupes} doublons (aircraft_id, year_month)")
    required = {"aircraft_id", "year_month", "month_start_date", "total_parking_minutes"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"{name}: colonnes manquantes {missing}")
