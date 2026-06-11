"""Chargement des fichiers de donnees."""
from __future__ import annotations
import pandas as pd
from . import config as C


def load_corrosions() -> pd.DataFrame:
    df = pd.read_csv(C.RAW_TRAIN_CORR, parse_dates=["observation_date"])
    return df


def load_environment(kind: str = "train") -> pd.DataFrame:
    """kind in {'train', 'test'}."""
    path = C.RAW_TRAIN_ENV if kind == "train" else C.RAW_TEST_ENV
    df = pd.read_csv(path)
    # Garde year_month en string '2018-04' (le format de submission)
    df['year_month'] = df['year_month'].astype(str)
    return df


def load_sample_submission() -> pd.DataFrame:
    return pd.read_csv(C.RAW_SAMPLE_SUB)


def load_delivery_dates() -> pd.DataFrame:
    """Date de livraison de chaque avion (estimee = premier mois present dans env)."""
    train_env = load_environment("train")
    test_env = load_environment("test")
    env = pd.concat([train_env, test_env], ignore_index=True)
    delivery = env.groupby('aircraft_id')['year_month'].min().reset_index()
    delivery.columns = ['aircraft_id', 'delivery_year_month']
    delivery['delivery_date'] = pd.to_datetime(delivery['delivery_year_month'] + '-01')
    return delivery
