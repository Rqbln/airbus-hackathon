"""Construction (avec cache) des matrices de features train et test.

Les matrices sont déterministes à partir des CSV bruts : elles sont mises en
cache en parquet dans data/processed/ et reconstruites si absentes.
"""

import pandas as pd

from . import data as raw_data
from . import features, paths, targets

TRAIN_MATRIX_PARQUET = paths.DATA_PROCESSED / "train_matrix.parquet"
TEST_FEATURES_PARQUET = paths.DATA_PROCESSED / "test_features.parquet"


def build_train_matrix(force: bool = False) -> pd.DataFrame:
    if TRAIN_MATRIX_PARQUET.exists() and not force:
        return pd.read_parquet(TRAIN_MATRIX_PARQUET)
    paths.ensure_dirs()
    env = raw_data.load_environment_training()
    corrosions = raw_data.load_corrosions()
    labels = targets.build_labels(corrosions, env)
    env_feat = features.build_features(env)
    train_mat = features.build_train_matrix(labels, env_feat)
    # ref_month est un Period non sérialisable en parquet
    train_mat = train_mat.drop(columns=["ref_month"], errors="ignore")
    train_mat.to_parquet(TRAIN_MATRIX_PARQUET)
    return train_mat


def build_test_features(force: bool = False) -> pd.DataFrame:
    if TEST_FEATURES_PARQUET.exists() and not force:
        return pd.read_parquet(TEST_FEATURES_PARQUET)
    paths.ensure_dirs()
    env = raw_data.load_environment_test()
    test_feat = features.build_features(env)
    test_feat.to_parquet(TEST_FEATURES_PARQUET)
    return test_feat
