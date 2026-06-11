"""Feature engineering avance avec garanties anti-leakage.

Principe :
- Toutes les features cumulees/rolling sont calculees PAR AVION, triees par year_month.
- Pour une ligne (avion, mois M), seules les valeurs des mois <= M sont utilisees.
- Le calcul est fait sur l'historique COMPLET (train + test concat) puis indexe.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from . import config as C


def _sort_env(env: pd.DataFrame) -> pd.DataFrame:
    env = env.copy()
    env['_date'] = pd.to_datetime(env['year_month'] + '-01')
    env = env.sort_values(['aircraft_id', '_date']).reset_index(drop=True)
    return env


def add_age_features(env: pd.DataFrame, delivery: pd.DataFrame) -> pd.DataFrame:
    """age_months, years_since_delivery, month_sin/cos."""
    env = env.merge(delivery[['aircraft_id', 'delivery_date']], on='aircraft_id', how='left')
    env['_date'] = pd.to_datetime(env['year_month'] + '-01')
    env['age_months'] = (
        (env['_date'].dt.year - env['delivery_date'].dt.year) * 12
        + (env['_date'].dt.month - env['delivery_date'].dt.month)
    )
    env['years_since_delivery'] = env['age_months'] / 12.0
    env['_month'] = env['_date'].dt.month
    env['month_sin'] = np.sin(2 * np.pi * env['_month'] / 12)
    env['month_cos'] = np.cos(2 * np.pi * env['_month'] / 12)
    env = env.drop(columns=['_month', 'delivery_date'])
    return env


def add_interaction_features(env: pd.DataFrame) -> pd.DataFrame:
    """Interactions ponctuelles (mois courant)."""
    env = env.copy()
    h = env['metar_relative_humidity'].fillna(0)
    p = env['total_parking_minutes'].fillna(0)
    salt = env['sea_salt_aerosol_05_5_mixing_ratio'].fillna(0)
    so2 = env['sulphur_dioxide_mass_mixing_ratio'].fillna(0)
    o3 = env['ozone_mass_mixing_ratio'].fillna(0)

    env['humidity_x_salt'] = h * salt
    env['humidity_x_so2'] = h * so2
    env['humidity_x_o3'] = h * o3
    env['parking_x_humidity'] = p * h
    env['parking_x_salt'] = p * salt
    env['parking_x_so2'] = p * so2
    return env


def add_cumulative_features(env: pd.DataFrame) -> pd.DataFrame:
    """Cumuls strictement <= mois courant, calcules par aircraft_id et tries par date.
    Inclus le mois courant (ce qui correspond a l'exposition totale jusqu'a la decision)."""
    env = _sort_env(env)
    g = env.groupby('aircraft_id', sort=False)

    # Cumul de parking
    env['cum_parking_minutes'] = g['total_parking_minutes'].cumsum()

    # Cumuls d'exposition: somme(variable * parking_minutes) -> dose realisticment vecue
    parking = env['total_parking_minutes'].fillna(0)
    for var, alias in [
        ('sea_salt_aerosol_05_5_mixing_ratio', 'cum_sea_salt_exposure'),
        ('sea_salt_aerosol_003_05_mixing_ratio', 'cum_sea_salt_fine_exposure'),
        ('sulphur_dioxide_mass_mixing_ratio', 'cum_so2_exposure'),
        ('ozone_mass_mixing_ratio', 'cum_ozone_exposure'),
        ('hno3', 'cum_hno3_exposure'),
        ('sulphate_aerosol_mixing_ratio', 'cum_sulphate_exposure'),
        ('nitrogen_dioxide_mass_mixing_ratio', 'cum_no2_exposure'),
        ('metar_relative_humidity', 'cum_humidity_exposure'),
    ]:
        dose = (env[var].fillna(0) * parking)
        env[alias] = dose.groupby(env['aircraft_id']).cumsum()

    # Cumuls d'interactions chimie-corrosion
    h = env['metar_relative_humidity'].fillna(0)
    salt = env['sea_salt_aerosol_05_5_mixing_ratio'].fillna(0)
    so2 = env['sulphur_dioxide_mass_mixing_ratio'].fillna(0)
    env['cum_humidity_x_salt'] = (h * salt * parking).groupby(env['aircraft_id']).cumsum()
    env['cum_humidity_x_so2'] = (h * so2 * parking).groupby(env['aircraft_id']).cumsum()

    return env


def add_rolling_features(env: pd.DataFrame, windows=C.ROLLING_WINDOWS,
                         vars_=C.KEY_VARS) -> pd.DataFrame:
    """Pour chaque variable cle et chaque fenetre w: mean, max sur w derniers mois.
    Fenetre glissante = [M-w+1 ... M] (inclut M)."""
    env = _sort_env(env)
    g = env.groupby('aircraft_id', sort=False)

    new_cols = {}
    for var in vars_:
        s = env[var]
        s_by = g[var]
        for w in windows:
            roll = s_by.rolling(window=w, min_periods=1)
            new_cols[f'{var}__roll{w}_mean'] = roll.mean().reset_index(level=0, drop=True)
            new_cols[f'{var}__roll{w}_max'] = roll.max().reset_index(level=0, drop=True)
    rolling_df = pd.DataFrame(new_cols, index=env.index)
    env = pd.concat([env, rolling_df], axis=1)
    return env


def build_full_features(env_train: pd.DataFrame, env_test: pd.DataFrame,
                        delivery: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Construit le feature matrix pour train ET test, en utilisant l'historique COMPLET
    de chaque avion (chaque avion est present soit dans train soit dans test, jamais les deux).
    Retourne (env_train_fe, env_test_fe).
    """
    train_ids = set(env_train['aircraft_id'].unique())
    test_ids = set(env_test['aircraft_id'].unique())
    assert not (train_ids & test_ids), "Les avions train et test se recouvrent !"

    # On peut traiter train et test separement (avions disjoints)
    out = []
    for env in (env_train, env_test):
        env = add_age_features(env, delivery)
        env = add_interaction_features(env)
        env = add_cumulative_features(env)
        env = add_rolling_features(env)
        out.append(env)
    return out[0], out[1]


def get_feature_columns(env_fe: pd.DataFrame) -> list[str]:
    """Liste les colonnes de features (numeriques) a passer au modele."""
    drop = set(C.ID_COLS) | {'_date'}
    return [c for c in env_fe.columns
            if c not in drop and pd.api.types.is_numeric_dtype(env_fe[c])]
