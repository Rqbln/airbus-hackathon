"""Construction des labels — port du notebook 02_target_construction.

Convention Airbus : pour chaque avion, le mois d'observation de la corrosion
vaut y=1 et le mois exactement OFFSET_MONTHS (24) plus tôt vaut y=0.
"""

import pandas as pd

OFFSET_MONTHS = 24


def build_labels(corrosions: pd.DataFrame, env_train: pd.DataFrame) -> pd.DataFrame:
    """Retourne le tableau de labels (1 516 lignes attendues pour 758 avions).

    Colonnes : aircraft_id, year_month, y, env_available, flag_prior_corrosion.
    Les 32 avions sans aucun historique environnemental sont supprimés.
    """
    corr = corrosions.sort_values("observation_date").reset_index(drop=True)

    aircraft_with_env = set(env_train["aircraft_id"].unique())
    corr = corr[corr["aircraft_id"].isin(aircraft_with_env)].reset_index(drop=True)

    corr["obs_month"] = corr["observation_date"].dt.to_period("M")

    pos = pd.DataFrame(
        {"aircraft_id": corr["aircraft_id"], "ref_month": corr["obs_month"], "y": 1}
    )
    neg = pd.DataFrame(
        {
            "aircraft_id": corr["aircraft_id"],
            "ref_month": corr["obs_month"] - OFFSET_MONTHS,
            "y": 0,
        }
    )
    labels = pd.concat([pos, neg], ignore_index=True)
    labels["year_month"] = labels["ref_month"].astype(str)
    labels = labels.sort_values(["aircraft_id", "ref_month"]).reset_index(drop=True)

    # Disponibilité de l'environnement au mois exact (informatif, lignes conservées)
    env_keys = env_train[["aircraft_id", "year_month"]].drop_duplicates()
    env_keys = env_keys.assign(env_available=True)
    labels = labels.merge(env_keys, on=["aircraft_id", "year_month"], how="left")
    labels["env_available"] = labels["env_available"].fillna(False).astype(bool)

    # Garde-fou : un mois y=0 postérieur à une corrosion déjà observée serait suspect
    corr_months = corr.groupby("aircraft_id")["obs_month"].apply(list).to_dict()
    labels["flag_prior_corrosion"] = [
        row.y == 0 and any(m < row.ref_month for m in corr_months.get(row.aircraft_id, []))
        for row in labels.itertuples()
    ]
    return labels
