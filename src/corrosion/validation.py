"""Validation croisee GroupKFold + metriques."""
from __future__ import annotations
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from sklearn.metrics import brier_score_loss, roc_auc_score
from . import config as C


def cv_oof(estimator_factory, X, y, groups, n_splits=C.N_FOLDS, verbose=True):
    """Cross-validation GroupKFold. estimator_factory: callable -> nouveau modele fit-able.
    Retourne (oof_preds, fold_scores: list[dict])."""
    gkf = GroupKFold(n_splits=n_splits)
    oof = np.zeros(len(X))
    fold_scores = []
    for fold, (tr_idx, va_idx) in enumerate(gkf.split(X, y, groups), 1):
        model = estimator_factory()
        X_tr = X.iloc[tr_idx] if hasattr(X, 'iloc') else X[tr_idx]
        X_va = X.iloc[va_idx] if hasattr(X, 'iloc') else X[va_idx]
        y_tr, y_va = y[tr_idx], y[va_idx]
        model.fit(X_tr, y_tr)
        preds = model.predict_proba(X_va)[:, 1]
        oof[va_idx] = preds
        brier = brier_score_loss(y_va, preds)
        try:
            auc = roc_auc_score(y_va, preds)
        except Exception:
            auc = float('nan')
        fold_scores.append({'fold': fold, 'brier': brier, 'auc': auc, 'n_val': len(va_idx)})
        if verbose:
            print(f"  Fold {fold}: brier={brier:.4f} auc={auc:.4f} n_val={len(va_idx)}")
    return oof, fold_scores


def summarize_scores(fold_scores: list[dict]) -> dict:
    briers = [s['brier'] for s in fold_scores]
    aucs = [s['auc'] for s in fold_scores]
    return {
        'brier_mean': float(np.mean(briers)),
        'brier_std': float(np.std(briers)),
        'auc_mean': float(np.nanmean(aucs)),
        'auc_std': float(np.nanstd(aucs)),
        'n_folds': len(fold_scores),
    }
