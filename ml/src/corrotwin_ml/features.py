"""Feature engineering physics-informed — port du notebook 04_feature_engineering.

Le mécanisme de corrosion atmosphérique exige trois facteurs SIMULTANÉS et
multiplicatifs : un électrolyte (film d'eau), des ions agressifs dissous
(chlorure, acide) et du temps d'exposition. Chaque feature est un produit de
ces trois facteurs, intégré dans le temps (forme dose-réponse ISO 9223).

Toutes les agrégations sont strictement causales (mois <= mois scoré).
"""

import numpy as np
import pandas as pd

# Constantes physiques (littérature corrosion / ISO 9223)
RH_THRESHOLD = 80.0  # %RH où le film d'eau se forme (time-of-wetness)
TOW_STEEPNESS = 5.0  # raideur logistique de la porte de mouillage
EA_J_PER_MOL = 50_000.0  # énergie d'activation Arrhenius (~x2 par +10 °C)
R_GAS = 8.314  # J/mol/K
T_REF_K = 298.15  # référence 25 °C -> facteur Arrhenius = 1
ACID_WEIGHT = 1.0  # poids relatif des espèces acides vs chlorure
ROLL_WINDOWS = [6, 12, 24]  # fenêtres glissantes (mois)

DOSE_COLS = [
    "parking_hours",
    "wet_parking",
    "salt_wet_dose",
    "acid_dose",
    "acid_prod_dose",
    "arr_wet_dose",
    "corrosivity_increment",
]

FINGERPRINT_COLS = {
    "fp_coarse_seasalt": "sea_salt_aerosol_5_20_mixing_ratio",  # stationné en bord de mer
    "fp_so2": "sulphur_dioxide_mass_mixing_ratio",  # aéroport industriel
    "fp_black_carbon": "black_carbon",  # urbain / suie
    "fp_isoprene": "isoprene",  # végétation / tropical
    "fp_humidity": "metar_relative_humidity",
    "fp_temp_c": "metar_temperature_c",
}

# Colonnes interdites en entrée du modèle : identifiants, cible, et flags de
# disponibilité des données (corrélés à la récence, donc au label -> leakage).
BLOCKED_COLUMNS = {
    "y",
    "aircraft_id",
    "year_month",
    "feat_year_month",
    "ref_month",
    "ref_ts",
    "feat_ts",
    "month_start_date",
    "feat_gap_months",
    "exact_month",
    "env_available",
    "flag_prior_corrosion",
}

# Features d'âge/exposition pure — exclues du feature set "no_age" (ablation :
# mesure le signal purement environnemental, sans le proxy d'âge des paires +24 mois)
AGE_COLUMNS = {"age_months", "parking_hours_cum"}


def add_monthly_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # --- Facteur 1 : électrolyte / time-of-wetness ---
    rh = df["metar_relative_humidity"]
    # Porte logistique de mouillage, coupée sous 0 °C (électrolyte gelé = pas de circuit).
    df["tow_gate"] = (1.0 / (1.0 + np.exp(-(rh - RH_THRESHOLD) / TOW_STEEPNESS))) * (
        df["metar_temperature_c"] >= 0
    )
    df["rh_excess"] = (rh - RH_THRESHOLD).clip(lower=0)
    df["dew_spread"] = df["metar_temperature_c"] - df["metar_dew_point_c"]
    df["condensation"] = np.exp(-df["dew_spread"].clip(lower=0) / 3.0)
    df["freezing"] = (df["metar_temperature_c"] < 0).astype(int)

    # Facteur Arrhenius relatif à 25 °C, coupé sous 0 °C
    tk = df["temperature"]  # Kelvin
    df["arrhenius_rel"] = np.exp(-(EA_J_PER_MOL / R_GAS) * (1.0 / tk - 1.0 / T_REF_K))
    df["arrhenius_rel"] = df["arrhenius_rel"] * (df["metar_temperature_c"] >= 0)

    # --- Facteur 2 : agressivité de l'électrolyte ---
    df["chloride"] = (
        df["sea_salt_aerosol_003_05_mixing_ratio"]
        + df["sea_salt_aerosol_05_5_mixing_ratio"]
        + df["sea_salt_aerosol_5_20_mixing_ratio"]
    )
    df["acid_species"] = (
        df["sulphur_dioxide_mass_mixing_ratio"]
        + df["sulphate_aerosol_mixing_ratio"]
        + df["hno3"]
    )
    df["oxidant"] = df["h2o2"] + df["ozone_mass_mixing_ratio"]
    df["black_carbon"] = (
        df["hydrophilic_black_carbon_aerosol_mixing_ratio"]
        + df["hydrophobic_black_carbon_aerosol_mixing_ratio"]
    )

    # --- Facteur 3 : temps ---
    df["parking_hours"] = df["total_parking_minutes"] / 60.0
    return df


def add_dose_increments(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    wet_park = df["parking_hours"] * df["tow_gate"]
    df["wet_parking"] = wet_park
    df["salt_wet_dose"] = wet_park * df["chloride"]
    df["acid_dose"] = wet_park * df["acid_species"]
    df["acid_prod_dose"] = (
        wet_park * df["sulphur_dioxide_mass_mixing_ratio"] * df["oxidant"]
    )
    df["arr_wet_dose"] = wet_park * df["arrhenius_rel"]
    # Incrément de corrosivité mensuel type ISO 9223 (mixing ratios en proxy de dépôt)
    df["corrosivity_increment"] = (
        wet_park * df["arrhenius_rel"] * (df["chloride"] + ACID_WEIGHT * df["acid_species"])
    )
    return df


def add_cumulative_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["aircraft_id", "month_start_date"]).copy()
    g = df.groupby("aircraft_id", sort=False)

    # Proxy d'âge : mois depuis le premier relevé env (identique train/test —
    # pas de date de livraison côté test)
    df["age_months"] = g.cumcount() + 1

    for col in DOSE_COLS:
        df[f"{col}_cum"] = g[col].cumsum()
        for w in ROLL_WINDOWS:
            df[f"{col}_roll{w}m"] = g[col].transform(
                lambda s, w=w: s.rolling(w, min_periods=1).sum()
            )

    # Empreintes d'environnement (moyennes long terme par avion)
    for name, col in FINGERPRINT_COLS.items():
        df[name] = g[col].transform("mean")
    return df


def build_features(env: pd.DataFrame) -> pd.DataFrame:
    """Pipeline complet, identique octet pour octet entre train et test."""
    return add_cumulative_features(add_dose_increments(add_monthly_features(env)))


def build_train_matrix(labels: pd.DataFrame, env_features: pd.DataFrame) -> pd.DataFrame:
    """Attache les features aux labels par jointure as-of backward.

    Chaque ligne de label prend les features de son dernier mois env <= mois
    de référence ; conserve les 246 lignes sans env au mois exact (la
    fraîcheur est tracée dans feat_gap_months, jamais donnée au modèle).
    """
    labels = labels.copy()
    labels["ref_ts"] = pd.PeriodIndex(labels["year_month"], freq="M").to_timestamp()
    labels = labels.sort_values("ref_ts").reset_index(drop=True)

    feat = env_features.copy()
    feat["feat_ts"] = pd.PeriodIndex(feat["year_month"], freq="M").to_timestamp()
    feat = feat.rename(columns={"year_month": "feat_year_month"}).sort_values("feat_ts")

    train_mat = pd.merge_asof(
        labels, feat, left_on="ref_ts", right_on="feat_ts",
        by="aircraft_id", direction="backward",
    )
    train_mat["feat_gap_months"] = (
        (train_mat["ref_ts"].dt.year - train_mat["feat_ts"].dt.year) * 12
        + (train_mat["ref_ts"].dt.month - train_mat["feat_ts"].dt.month)
    )
    train_mat["exact_month"] = train_mat["feat_gap_months"] == 0
    return train_mat


RAW_ENGINEERED = [
    "tow_gate", "rh_excess", "dew_spread", "condensation", "freezing",
    "arrhenius_rel", "chloride", "acid_species", "oxidant", "black_carbon",
    "parking_hours", "age_months",
]


def select_feature_columns(
    train_mat: pd.DataFrame, test_mat: pd.DataFrame, feature_set: str = "full"
) -> list[str]:
    """Colonnes numériques communes train/test, hors colonnes bloquées.

    - full   : toutes les features (85 attendues)
    - no_age : sans age_months ni parking cumulé (signal purement environnemental)
    - raw    : uniquement les colonnes environnementales brutes du CSV
    """
    cols = [
        c
        for c in train_mat.columns
        if c not in BLOCKED_COLUMNS
        and pd.api.types.is_numeric_dtype(train_mat[c])
        and c in test_mat.columns
    ]
    if feature_set == "no_age":
        cols = [c for c in cols if c not in AGE_COLUMNS]
    elif feature_set == "raw":
        engineered = (
            set(RAW_ENGINEERED)
            | {f"{d}_cum" for d in DOSE_COLS}
            | {f"{d}_roll{w}m" for d in DOSE_COLS for w in ROLL_WINDOWS}
            | set(FINGERPRINT_COLS)
            | {"wet_parking", "salt_wet_dose", "acid_dose", "acid_prod_dose",
               "arr_wet_dose", "corrosivity_increment"}
        )
        cols = [c for c in cols if c not in engineered]
    return cols
