"""
Phase 1 - Exploration des donnees HAKS Airbus x IBM x AWS 2026
Objectif: comprendre la structure des donnees avant feature engineering.
"""
import pandas as pd
import numpy as np
from pathlib import Path

DATA_DIR = Path(r"C:\Users\louay\Desktop\Hackathon-IBM-Airbus")

print("=" * 70)
print("CHARGEMENT DES FICHIERS")
print("=" * 70)

corr = pd.read_csv(DATA_DIR / "corrosions_training.csv", parse_dates=["observation_date"])
env_train = pd.read_csv(DATA_DIR / "environment_training.csv", parse_dates=["month_start_date"])
env_test = pd.read_csv(DATA_DIR / "environment_test.csv", parse_dates=["month_start_date"])
submission = pd.read_csv(DATA_DIR / "sample_submission-3.csv")

print(f"corrosions_training       : {corr.shape}")
print(f"environment_training      : {env_train.shape}")
print(f"environment_test          : {env_test.shape}")
print(f"sample_submission         : {submission.shape}")

print("\n" + "=" * 70)
print("1. CORROSIONS_TRAINING - verifs")
print("=" * 70)
print(f"Avions uniques            : {corr['aircraft_id'].nunique()}")
print(f"Doublons d'aircraft_id    : {corr.duplicated(subset='aircraft_id').sum()}")
print(f"Periode observations      : {corr['observation_date'].min()} -> {corr['observation_date'].max()}")
print(f"Repartition annees livraison:")
print(corr['aircraft_delivery_year'].value_counts().sort_index())

print("\n" + "=" * 70)
print("2. ENVIRONMENT_TRAINING - verifs")
print("=" * 70)
print(f"Avions uniques            : {env_train['aircraft_id'].nunique()}")
print(f"Periode year_month        : {env_train['year_month'].min()} -> {env_train['year_month'].max()}")
print(f"Mois par avion (stats)    :")
print(env_train.groupby('aircraft_id').size().describe())
print(f"\nNaN par colonne (top 10)  :")
nan_cnt = env_train.isna().sum().sort_values(ascending=False)
print(nan_cnt.head(10))

print("\n" + "=" * 70)
print("3. ENVIRONMENT_TEST - verifs")
print("=" * 70)
print(f"Avions uniques            : {env_test['aircraft_id'].nunique()}")
print(f"Periode year_month        : {env_test['year_month'].min()} -> {env_test['year_month'].max()}")
print(f"Mois par avion (stats)    :")
print(env_test.groupby('aircraft_id').size().describe())

print("\n" + "=" * 70)
print("4. VERIFICATION CRITIQUE: 24 mois avant l'observation")
print("=" * 70)
# Pour chaque avion train, on a besoin de (mois_obs) ET (mois_obs - 24 mois)
# On verifie que ces deux mois existent dans environment_training

# Construction du year_month cible
corr['obs_year_month'] = corr['observation_date'].dt.strftime('%Y-%m')
corr['obs_minus_24_date'] = corr['observation_date'] - pd.DateOffset(months=24)
corr['obs_minus_24_year_month'] = corr['obs_minus_24_date'].dt.strftime('%Y-%m')

# Index pour lookup rapide
env_train_idx = env_train.set_index(['aircraft_id', 'year_month']).index

obs_present = corr.apply(
    lambda r: (r['aircraft_id'], r['obs_year_month']) in env_train_idx, axis=1
)
obs_m24_present = corr.apply(
    lambda r: (r['aircraft_id'], r['obs_minus_24_year_month']) in env_train_idx, axis=1
)
print(f"Avions avec mois_observation present dans env_training      : {obs_present.sum()}/{len(corr)}")
print(f"Avions avec mois_observation - 24 present dans env_training : {obs_m24_present.sum()}/{len(corr)}")
print(f"Avions avec LES DEUX present                                : {(obs_present & obs_m24_present).sum()}/{len(corr)}")

print("\n" + "=" * 70)
print("5. COLONNES FEATURES")
print("=" * 70)
id_cols = ['aircraft_id', 'year_month', 'month_start_date']
feature_cols = [c for c in env_train.columns if c not in id_cols]
print(f"Nombre de features        : {len(feature_cols)}")
print(f"Features                  :")
for c in feature_cols:
    s = env_train[c]
    print(f"  {c:55s} | min={s.min():.3e} | mean={s.mean():.3e} | max={s.max():.3e}")

print("\n" + "=" * 70)
print("6. SAMPLE_SUBMISSION - structure")
print("=" * 70)
submission['aircraft_id'] = submission['id'].str.split('_').str[0]
submission['year_month'] = submission['id'].str.split('_').str[1]
print(f"Lignes uniques            : {submission['id'].nunique()}")
print(f"Avions uniques            : {submission['aircraft_id'].nunique()}")
print(f"Mois min                  : {submission['year_month'].min()}")
print(f"Mois max                  : {submission['year_month'].max()}")
# Verif: chaque (avion, mois) du submission existe-t-il dans environment_test ?
env_test_idx = env_test.set_index(['aircraft_id', 'year_month']).index
sub_present = submission.apply(lambda r: (r['aircraft_id'], r['year_month']) in env_test_idx, axis=1)
print(f"Lignes submission presentes dans environment_test : {sub_present.sum()}/{len(submission)}")

print("\n" + "=" * 70)
print("EXPLORATION TERMINEE")
print("=" * 70)
