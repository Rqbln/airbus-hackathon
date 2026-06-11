# 04 — Pipeline ML

## Registre des modèles (`models.py`)

| `model_name` | Algorithme |
|--------------|------------|
| `histgb` | HistGradientBoostingClassifier (défaut, compatible Python 3.14) |
| `lightgbm` | LGBMClassifier (si wheel disponible) |
| `logreg` | LogisticRegression + StandardScaler |
| `constant` | Probabilité fixe 0.5 (baseline Brier = 0.25) |

## Calibration

| `calibration` | Méthode |
|---------------|---------|
| `sigmoid` | Platt scaling (recommandé, petit n) |
| `isotonic` | Régression isotonique |
| `none` | Pas de post-calibration |

## Cross-validation

- `GroupKFold(n_splits=5)` sur `aircraft_id`
- Métriques OOF calculées sur toutes les prédictions out-of-fold

## Métriques par run (`metrics.json`)

| Métrique | Usage |
|----------|-------|
| `brier` | Objectif principal |
| `fold_brier` | Stabilité par fold |
| `brier_decomposition` | reliability / resolution / uncertainty |
| `log_loss`, `roc_auc`, `ece` | Diagnostic |
| `calibration_curve` | Courbe de calibration (10 bins) |
| `prediction_histogram` | Distribution des probas par classe |
| `feature_importance` | Gain + permutation (top 30) |
| `delta_vs_baseline_025` | Gain vs constante 0.5 |
| `delta_vs_best_run` | Gain vs meilleur run précédent |

## Artefacts d'un run (`data/artifacts/runs/<run_id>/`)

```
config.json      # ExperimentConfig
metrics.json     # métriques + statut
features.json    # liste des colonnes
model.joblib     # modèle calibré
oof.csv          # prédictions OOF
```

## CLI

```bash
.venv/bin/python -m corrotwin_ml.cli train --model histgb --calibration sigmoid
.venv/bin/python -m corrotwin_ml.cli submission
```

## Ajouter un modèle

1. Implémenter dans `create_estimator()` (`models.py`)
2. Ajouter la valeur dans `ExperimentConfig.ModelName`
3. Exposer dans le select du Labo ML frontend
