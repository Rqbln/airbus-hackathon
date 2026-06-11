"""Calibration post-hoc des probabilités (le Brier la récompense directement).

- sigmoid (Platt) : régression logistique sur le logit — robuste aux petits
  effectifs (~758 positifs), recommandé par défaut.
- isotonic : régression isotonique — plus flexible mais risque de surapprentissage
  sous ~1 000 positifs. Mesuré en OOF plutôt que supposé.
"""

import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression

EPS = 1e-7


class Calibrator:
    """Calibrateur ajusté sur des prédictions out-of-fold (jamais in-sample)."""

    def __init__(self, method: str = "sigmoid"):
        if method not in {"none", "sigmoid", "isotonic"}:
            raise ValueError(f"Méthode de calibration inconnue : {method}")
        self.method = method
        self._model = None

    def fit(self, p_raw: np.ndarray, y: np.ndarray) -> "Calibrator":
        if self.method == "none":
            return self
        p = np.clip(np.asarray(p_raw, dtype=float), EPS, 1 - EPS)
        if self.method == "sigmoid":
            z = np.log(p / (1 - p)).reshape(-1, 1)
            self._model = LogisticRegression(C=1e6, max_iter=1000)
            self._model.fit(z, y)
        else:
            self._model = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip")
            self._model.fit(p, y)
        return self

    def transform(self, p_raw: np.ndarray) -> np.ndarray:
        if self.method == "none" or self._model is None:
            return np.asarray(p_raw, dtype=float)
        p = np.clip(np.asarray(p_raw, dtype=float), EPS, 1 - EPS)
        if self.method == "sigmoid":
            z = np.log(p / (1 - p)).reshape(-1, 1)
            return self._model.predict_proba(z)[:, 1]
        return self._model.predict(p)
