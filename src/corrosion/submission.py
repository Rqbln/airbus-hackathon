"""Generation et validation des fichiers de submission."""
from __future__ import annotations
import pandas as pd
from . import config as C


def build_submission(env_test_with_preds: pd.DataFrame, sample_sub: pd.DataFrame,
                     pred_col: str = 'pred') -> pd.DataFrame:
    """Construit un DataFrame respectant le format sample_submission."""
    env = env_test_with_preds.copy()
    if 'id' not in env.columns:
        env['id'] = env['aircraft_id'] + '_' + env['year_month'].astype(str)
    sub = sample_sub[['id']].merge(env[['id', pred_col]], on='id', how='left')
    missing = sub[pred_col].isna().sum()
    if missing:
        raise ValueError(f"{missing} predictions manquantes!")
    sub = sub.rename(columns={pred_col: C.TARGET_COL})
    sub[C.TARGET_COL] = sub[C.TARGET_COL].clip(0.0, 1.0)
    return sub


def save_submission(sub: pd.DataFrame, name: str) -> str:
    path = C.SUBMISSIONS_DIR / name
    sub.to_csv(path, index=False)
    return str(path)
