"""Calibration des probabilites."""
from __future__ import annotations
from sklearn.calibration import CalibratedClassifierCV
from sklearn.base import clone


def make_calibrated(base_estimator, method='sigmoid', cv=5):
    """Renvoie un estimateur calibre par CV interne. method in {sigmoid, isotonic}."""
    return CalibratedClassifierCV(estimator=clone(base_estimator), method=method, cv=cv)
