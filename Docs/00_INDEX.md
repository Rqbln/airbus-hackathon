# CorroTwin — Index documentation

## Projet

Prédiction du **risque de corrosion** des ailes d'aéronefs (HAKS 2026 Airbus × IBM × AWS). Métrique : **Brier score** (plus bas = mieux, baseline 0.25).

## Carte du dépôt

| Chemin | Rôle |
|--------|------|
| `data/raw/` | CSV hackathon (environment, corrosions, sample_submission) |
| `data/artifacts/runs/` | Runs ML (config, metrics, model.joblib) |
| `data/submissions/` | Soumissions Kaggle générées |
| `ml/src/corrotwin_ml/` | Pipeline ML Python |
| `backend/app/` | API FastAPI (:8000) |
| `frontend/src/` | UI Next.js + shadcn (:3000) |
| `notebooks/` | EDA et construction des labels |
| `docs/` | Documentation (ce dossier) |

## Documents

1. [01_PROBLEM.md](01_PROBLEM.md) — Problème et métrique
2. [02_DATA.md](02_DATA.md) — Schéma et qualité des données
3. [03_FEATURES.md](03_FEATURES.md) — Feature engineering
4. [04_ML_PIPELINE.md](04_ML_PIPELINE.md) — Entraînement, runs, métriques
5. [05_API.md](05_API.md) — Référence API
6. [06_FRONTEND.md](06_FRONTEND.md) — Interface utilisateur
7. [07_RUNBOOK.md](07_RUNBOOK.md) — Démarrage et opérations
8. [08_CONVENTIONS.md](08_CONVENTIONS.md) — Conventions de développement

## Chiffres clés

| Élément | Valeur |
|---------|--------|
| Avions entraînement (env) | 758 |
| Labels équilibrés | 1 516 (758×2) |
| Avions test | 142 |
| Lignes environment_test | 14 303 |
| Baseline Brier (constante 0.5) | 0.25 |
