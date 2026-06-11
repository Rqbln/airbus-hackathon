"""Construction des cibles 0/1 selon la convention Airbus."""
from __future__ import annotations
import pandas as pd


def build_training_pairs(corr: pd.DataFrame) -> pd.DataFrame:
    """Pour chaque avion: une ligne 'mois d'observation' (target=1)
    et une ligne 'mois-24' (target=0). Retourne avion, year_month, target."""
    pos = pd.DataFrame({
        'aircraft_id': corr['aircraft_id'],
        'year_month': corr['observation_date'].dt.strftime('%Y-%m'),
        'target': 1,
    })
    neg = pd.DataFrame({
        'aircraft_id': corr['aircraft_id'],
        'year_month': (corr['observation_date'] - pd.DateOffset(months=24)).dt.strftime('%Y-%m'),
        'target': 0,
    })
    pairs = pd.concat([pos, neg], ignore_index=True)
    return pairs


def keep_complete_pairs(train_df: pd.DataFrame) -> pd.DataFrame:
    """Garde uniquement les avions ayant LES DEUX cibles (1 et 0) disponibles."""
    n_unique = train_df.groupby('aircraft_id')['target'].nunique()
    complete = n_unique[n_unique == 2].index
    return train_df[train_df['aircraft_id'].isin(complete)].reset_index(drop=True)
