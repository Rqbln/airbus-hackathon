"""Factories de modeles."""
from __future__ import annotations
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from . import config as C


def make_lightgbm(**overrides):
    import lightgbm as lgb
    params = dict(
        n_estimators=500,
        learning_rate=0.03,
        num_leaves=31,
        max_depth=-1,
        min_child_samples=10,
        subsample=0.85,
        subsample_freq=1,
        colsample_bytree=0.85,
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=C.RANDOM_STATE,
        verbose=-1,
        n_jobs=-1,
    )
    params.update(overrides)
    return lgb.LGBMClassifier(**params)


def make_xgboost(**overrides):
    import xgboost as xgb
    params = dict(
        n_estimators=500,
        learning_rate=0.03,
        max_depth=6,
        min_child_weight=5,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=C.RANDOM_STATE,
        tree_method='hist',
        eval_metric='logloss',
        n_jobs=-1,
    )
    params.update(overrides)
    return xgb.XGBClassifier(**params)


def make_catboost(**overrides):
    from catboost import CatBoostClassifier
    params = dict(
        iterations=500,
        learning_rate=0.05,
        depth=6,
        l2_leaf_reg=3.0,
        random_seed=C.RANDOM_STATE,
        verbose=0,
        allow_writing_files=False,
    )
    params.update(overrides)
    return CatBoostClassifier(**params)


def make_histgb(**overrides):
    params = dict(
        max_iter=400,
        learning_rate=0.05,
        max_leaf_nodes=31,
        min_samples_leaf=10,
        l2_regularization=0.1,
        random_state=C.RANDOM_STATE,
    )
    params.update(overrides)
    return HistGradientBoostingClassifier(**params)


def make_logreg(**overrides):
    params = dict(
        C=1.0,
        max_iter=2000,
        random_state=C.RANDOM_STATE,
    )
    params.update(overrides)
    return Pipeline([
        ('imp', SimpleImputer(strategy='median')),
        ('sc', StandardScaler()),
        ('lr', LogisticRegression(**params)),
    ])


MODEL_FACTORIES = {
    'lightgbm': make_lightgbm,
    'xgboost': make_xgboost,
    'catboost': make_catboost,
    'histgb': make_histgb,
    'logreg': make_logreg,
}
