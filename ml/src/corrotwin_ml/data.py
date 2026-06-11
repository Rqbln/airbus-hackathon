from __future__ import annotations

from pathlib import Path

import pandas as pd

from .config import DATA_RAW

ID_COLS = ["aircraft_id", "year_month", "month_start_date"]
TARGET_COL = "corrosion_risk"


def load_corrosions(path: Path | None = None) -> pd.DataFrame:
    path = path or DATA_RAW / "corrosions_training.csv"
    df = pd.read_csv(path, parse_dates=["observation_date"])
    return df.sort_values("observation_date").reset_index(drop=True)


def load_environment_train(path: Path | None = None) -> pd.DataFrame:
    path = path or DATA_RAW / "environment_training.csv"
    df = pd.read_csv(path, parse_dates=["month_start_date"])
    return df.sort_values(["aircraft_id", "month_start_date"]).reset_index(drop=True)


def load_environment_test(path: Path | None = None) -> pd.DataFrame:
    path = path or DATA_RAW / "environment_test.csv"
    df = pd.read_csv(path, parse_dates=["month_start_date"])
    return df.sort_values(["aircraft_id", "month_start_date"]).reset_index(drop=True)


def load_sample_submission(path: Path | None = None) -> pd.DataFrame:
    path = path or DATA_RAW / "sample_submission.csv"
    return pd.read_csv(path)


def validate_data(env: pd.DataFrame, corr: pd.DataFrame) -> dict:
    aircraft_with_env = set(env["aircraft_id"].unique())
    corr_ids = set(corr["aircraft_id"].unique())
    orphan = corr_ids - aircraft_with_env
    dup = env.duplicated(subset=["aircraft_id", "year_month"]).sum()
    return {
        "env_rows": len(env),
        "corr_rows": len(corr),
        "unique_aircraft_env": env["aircraft_id"].nunique(),
        "orphan_corrosion_aircraft": len(orphan),
        "duplicate_env_keys": int(dup),
    }


def feature_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c not in ID_COLS + [TARGET_COL, "y", "ref_month", "env_available", "flag_prior_corrosion"]]
