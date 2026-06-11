from __future__ import annotations

import pandas as pd

from .data import load_corrosions, load_environment_train


def build_labels(offset_months: int = 24) -> pd.DataFrame:
    """Construit les paires (y=1, y=0) selon la convention Airbus 24 mois."""
    corr = load_corrosions()
    env = load_environment_train()

    aircraft_with_env = set(env["aircraft_id"].unique())
    corr = corr[corr["aircraft_id"].isin(aircraft_with_env)].reset_index(drop=True)

    corr["obs_month"] = corr["observation_date"].dt.to_period("M")

    pos = pd.DataFrame(
        {"aircraft_id": corr["aircraft_id"], "ref_month": corr["obs_month"], "y": 1}
    )
    neg = pd.DataFrame(
        {
            "aircraft_id": corr["aircraft_id"],
            "ref_month": corr["obs_month"] - offset_months,
            "y": 0,
        }
    )

    labels = pd.concat([pos, neg], ignore_index=True)
    labels["year_month"] = labels["ref_month"].astype(str)
    labels = labels.sort_values(["aircraft_id", "ref_month"]).reset_index(drop=True)

    env_keys = env[["aircraft_id", "year_month"]].drop_duplicates()
    env_keys["env_available"] = True
    labels = labels.merge(env_keys, on=["aircraft_id", "year_month"], how="left")
    labels["env_available"] = labels["env_available"].fillna(False).astype(bool)

    corr_months = (
        corr.groupby("aircraft_id")["obs_month"]
        .apply(lambda s: sorted(s.tolist()))
        .to_dict()
    )

    def has_prior(row: pd.Series) -> bool:
        if row["y"] != 0:
            return False
        months = corr_months.get(row["aircraft_id"], [])
        return any(m < row["ref_month"] for m in months)

    labels["flag_prior_corrosion"] = labels.apply(has_prior, axis=1)
    return labels


def build_training_frame(
    offset_months: int = 24,
    drop_missing_env: bool = True,
) -> pd.DataFrame:
    labels = build_labels(offset_months=offset_months)
    env = load_environment_train()

    delivery = load_corrosions()[
        ["aircraft_id", "aircraft_delivery_year", "aircraft_delivery_month"]
    ].drop_duplicates()

    merged = labels.merge(
        env,
        on=["aircraft_id", "year_month"],
        how="left",
        suffixes=("", "_env"),
    ).merge(delivery, on="aircraft_id", how="left")
    if drop_missing_env:
        merged = merged[merged["env_available"]].reset_index(drop=True)
    merged["corrosion_risk"] = merged["y"].astype(float)
    return merged
