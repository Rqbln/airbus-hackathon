from __future__ import annotations

import numpy as np
import pandas as pd

from .config import FeatureSet
from .data import ID_COLS, TARGET_COL

SEA_SALT_COLS = [
    "sea_salt_aerosol_003_05_mixing_ratio",
    "sea_salt_aerosol_05_5_mixing_ratio",
    "sea_salt_aerosol_5_20_mixing_ratio",
]
LOG_COLS = [
    "dust_aerosol_003_055_mixing_ratio",
    "dust_aerosol_055_09_mixing_ratio",
    "dust_aerosol_09_20_mixing_ratio",
    "ozone_mass_mixing_ratio",
    "sulphur_dioxide_mass_mixing_ratio",
    "nitrogen_dioxide_mass_mixing_ratio",
]
ROLL_COLS = [
    "metar_relative_humidity",
    "metar_hour_precipitation",
    "total_parking_minutes",
    "cei_monthly",
    "tow_proxy",
]
LAG_COLS = [
    "metar_relative_humidity",
    "sulphur_dioxide_mass_mixing_ratio",
    "total_sea_salt",
    "cei_monthly",
]
WINDOWS = [3, 6, 12, 24]
LAGS = [1, 3, 6]


def _aircraft_age_months(df: pd.DataFrame) -> pd.Series:
    if "aircraft_delivery_year" not in df.columns:
        return pd.Series(0, index=df.index)
    delivery = pd.to_datetime(
        df["aircraft_delivery_year"].astype(str)
        + "-"
        + df.get("aircraft_delivery_month", 1).fillna(1).astype(int).astype(str).str.zfill(2)
        + "-01"
    )
    month = pd.to_datetime(df["month_start_date"])
    return ((month.dt.year - delivery.dt.year) * 12 + (month.dt.month - delivery.dt.month)).clip(lower=0)


def engineer_features(df: pd.DataFrame, feature_set: FeatureSet = "full") -> pd.DataFrame:
    """Features causales groupées par aircraft_id (pas de fuite temporelle)."""
    out = df.sort_values(["aircraft_id", "month_start_date"]).copy()

    out["total_sea_salt"] = out[SEA_SALT_COLS].sum(axis=1)
    out["cei_monthly"] = (
        out["total_parking_minutes"]
        * np.exp(0.046 * out["metar_relative_humidity"].fillna(0))
        * (
            out["total_sea_salt"].fillna(0)
            + 100 * out["sulphur_dioxide_mass_mixing_ratio"].fillna(0)
        )
    )
    out["tow_proxy"] = (
        out["metar_relative_humidity"].fillna(0)
        * out["metar_hour_precipitation"].fillna(0)
        * out["total_parking_minutes"].fillna(0)
        / 1e6
    )

    if feature_set in ("full", "base"):
        for col in LOG_COLS:
            if col in out.columns:
                out[f"log1p_{col}"] = np.log1p(out[col].clip(lower=0))

        g = out.groupby("aircraft_id", group_keys=False)
        out["cum_parking"] = g["total_parking_minutes"].cumsum()
        out["cum_cei"] = g["cei_monthly"].cumsum()
        out["cum_precip"] = g["metar_hour_precipitation"].cumsum()
        out["cum_sea_salt"] = g["total_sea_salt"].cumsum()

        for col in ROLL_COLS:
            if col not in out.columns:
                continue
            for w in WINDOWS:
                out[f"roll_mean_{col}_{w}m"] = g[col].transform(
                    lambda x, window=w: x.rolling(window=window, min_periods=1).mean()
                )
                out[f"roll_max_{col}_{w}m"] = g[col].transform(
                    lambda x, window=w: x.rolling(window=window, min_periods=1).max()
                )

        for col in LAG_COLS:
            if col not in out.columns:
                continue
            for lag in LAGS:
                out[f"lag_{col}_{lag}m"] = g[col].shift(lag)

        out["aircraft_age_months"] = _aircraft_age_months(out)

    if feature_set == "cei_only":
        g = out.groupby("aircraft_id", group_keys=False)
        out["cum_cei"] = g["cei_monthly"].cumsum()

    return out


def select_feature_matrix(
    df: pd.DataFrame,
    feature_set: FeatureSet = "full",
) -> tuple[pd.DataFrame, list[str]]:
    exclude = set(
        ID_COLS
        + [
            TARGET_COL,
            "y",
            "ref_month",
            "env_available",
            "flag_prior_corrosion",
            "observation_date",
            "obs_month",
            "aircraft_delivery_year",
            "aircraft_delivery_month",
        ]
    )
    cols = [c for c in df.columns if c not in exclude and pd.api.types.is_numeric_dtype(df[c])]

    if feature_set == "base":
        cols = [c for c in cols if not c.startswith(("roll_", "lag_", "log1p_"))]
    elif feature_set == "cei_only":
        cols = [c for c in cols if c in ("cei_monthly", "cum_cei", "total_sea_salt", "total_parking_minutes")]

    X = df[cols].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    return X, cols
