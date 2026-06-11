# 04 — Pipeline ML : modèles, validation, calibration, runs

> Implémentation : `ml/src/corrotwin_ml/`. Features : [03_FEATURES.md](03_FEATURES.md). Lancement : [07_RUNBOOK.md](07_RUNBOOK.md).

## Modules

| Module | Rôle |
|---|---|
| `config.py` | `ExperimentConfig` (modèle, params, feature_set, calibration, folds, seed) |
| `data.py` | Chargement + validations des CSV bruts |
| `targets.py` | Labels (paires y=1/y=0, offset 24 mois) |
| `features.py` | 85 features physics-informed + sélection de jeu |
| `dataset.py` | Matrices train/test avec cache parquet (`data/processed/`) |
| `models.py` | Registre : `lightgbm`, `histgb`, `logreg`, `constant`, `ensemble` |
| `calibration.py` | Calibrateur Platt (sigmoid) / isotonique, ajusté en OOF |
| `train.py` | `run_experiment(config)` : protocole complet ci-dessous |
| `metrics.py` | Brier (+ décomposition), log-loss, AUC, ECE, courbes |
| `tuning.py` | Random search (chaque essai = un run persisté) |
| `predict.py` | Soumission Kaggle alignée sur `sample_submission.csv` |
| `runs.py` | Persistance des runs + run actif |
| `cli.py` | `python -m corrotwin_ml.cli train/submission/list/tune` |

## Protocole d'entraînement (`train.py`)

1. **GroupKFold(n_splits)** par `aircraft_id` → prédictions out-of-fold brutes.
2. **Calibration en OOF croisé** : le calibrateur appliqué au fold f est ajusté sur les prédictions OOF des *autres* folds (jamais in-sample).
3. **Métriques** calculées sur l'OOF calibré (voir ci-dessous).
4. **Modèle final** réentraîné sur 100 % des données + calibrateur final ajusté sur tout l'OOF brut → inférence flotte test (14 303 lignes).

## Format d'un run — `data/artifacts/runs/<run_id>/`

| Fichier | Contenu |
|---|---|
| `config.json` | ExperimentConfig sérialisée (reproductibilité) |
| `status.json` | `pending` / `running` / `done` / `failed` (+ erreur) |
| `metrics.json` | Toutes les métriques (voir liste) |
| `model.joblib` | Modèle final + calibrateur + liste de features |
| `oof.csv` | Prédictions out-of-fold (audit) |
| `test_predictions.csv` | Risque par (avion, mois) de la flotte test |

Le **run actif** (pointeur `data/artifacts/active_run.txt`) alimente le dashboard. Auto-activation si meilleur Brier ; activation manuelle via l'API/frontend.

## Métriques persistées (`metrics.json`)

- `brier`, `brier_uncalibrated`, `log_loss`, `auc`, `ece`
- `brier_per_fold` (+ mean/std) — stabilité
- `brier_decomposition` : reliability (calibration, à réduire) / resolution (discrimination, à augmenter) / uncertainty (incompressible)
- `calibration_curve` (10 bins), `prediction_histogram` (20 bins, par classe)
- `permutation_importance` (top 30, scoring Brier, moyenne des folds), `gain_importance` (top 30, modèles à arbres)
- `brier_baseline_constant` (0.25), `brier_baseline_prevalence`
- `n_features`, `feature_columns`, `n_rows`, `n_aircraft`, `duration_seconds`

## Résultats de référence (OOF, cv5, seed 42)

| Run | Brier | AUC | ECE | Note |
|---|---|---|---|---|
| Constante 0.5 | 0.2500 | 0.500 | 0 | Sanity check |
| HistGB + Platt (params Moh) | **0.1511** | 0.856 | 0.028 | Réplique la baseline notebook 05 (0.1514 en split unique) |
| LightGBM + Platt | **0.1510** | 0.856 | 0.027 | |
| LightGBM + isotonique | **≈0.1499** | — | — | Légèrement meilleur ici malgré les ~758 positifs |
| LightGBM no_age + Platt | 0.1618 | — | — | Ablation : signal env pur, sans proxy d'âge |

La calibration apporte ~0.008-0.011 de Brier (0.159-0.162 brut → 0.150-0.151).

## Ajouter un modèle

1 entrée dans `REGISTRY` (`models.py`) + défauts dans `DEFAULT_PARAMS` (`config.py`) + le littéral dans `ModelName`. Il devient automatiquement disponible dans le CLI, l'API (`/api/lab/options`) et le frontend.
