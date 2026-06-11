# 00 — Index & carte du repo

> Point d'entrée de la documentation Bob-corn. Conçue pour donner à un agent IA (ou un humain) le contexte complet du projet. Index machine-readable : [`llms.txt`](llms.txt).

## Le projet en 3 phrases

1. **Problème** : prédire la probabilité de corrosion (`corrosion_risk ∈ [0,1]`) des voilures d'aéronefs à partir de leur historique mensuel d'exposition environnementale au sol (compétition Kaggle `haks-airbus-x-ibm-x-aws-2026`, métrique = Brier score, baseline à battre = 0.25).
2. **Solution ML** : features physics-informed (dose = temps de parking × mouillage × agressivité, forme ISO 9223), gradient boosting (LightGBM/HistGB) validé par GroupKFold par avion, calibration OOF (Platt/isotonique) — Brier OOF ≈ 0.15.
3. **Produit** : dashboard flotte + jumeau numérique + **Labo ML** (benchmark des modèles depuis le navigateur) + simulateur ROI. Tout tourne en local.

## Carte du repo

| Chemin | Contenu | Doc de référence |
|---|---|---|
| `data/raw/` | 4 CSV du challenge (versionnés) | [02_DATA.md](02_DATA.md) |
| `data/processed/` | Matrices de features en cache parquet (générées) | [03_FEATURES.md](03_FEATURES.md) |
| `data/artifacts/runs/<run_id>/` | Un dossier par entraînement : config, métriques, modèle, prédictions | [04_ML_PIPELINE.md](04_ML_PIPELINE.md) |
| `data/submissions/` | CSV de soumission Kaggle (générés) | [07_RUNBOOK.md](07_RUNBOOK.md) |
| `ml/src/bob_corn_ml/` | Package Python : pipeline complet | [04_ML_PIPELINE.md](04_ML_PIPELINE.md) |
| `backend/app/` | API FastAPI (port 8000) | [05_API.md](05_API.md) |
| `frontend/src/` | Next.js + shadcn/ui (port 3000, français) | [06_FRONTEND.md](06_FRONTEND.md) |
| `notebooks/` | Investigations 01→05 (la logique validée est portée dans `ml/`) | [01_PROBLEM.md](01_PROBLEM.md) |
| `output/` | Sorties horodatées des notebooks | — |
| `Makefile` | `make setup / train / api / web / submission` | [07_RUNBOOK.md](07_RUNBOOK.md) |

## Chiffres clés vérifiés

| Fait | Valeur |
|---|---|
| Avions d'entraînement avec historique env | **758** (790 dans corrosions_training, 32 orphelins supprimés) |
| Lignes de labels (paires y=1 / y=0) | **1 516** (équilibrées 758/758) |
| Avions de la flotte test | **142** |
| Lignes de test à prédire | **14 303** |
| Features du jeu `full` | **85** |
| Brier baseline (constante 0.5) | **0.2500** |
| Brier OOF de référence (LightGBM + Platt, cv5) | **≈ 0.151** |

## Ordre de lecture recommandé pour un agent

1. [01_PROBLEM.md](01_PROBLEM.md) — comprendre la cible et la métrique.
2. [02_DATA.md](02_DATA.md) — les données et leurs pièges.
3. [03_FEATURES.md](03_FEATURES.md) + [04_ML_PIPELINE.md](04_ML_PIPELINE.md) — comment on modélise.
4. [05_API.md](05_API.md) + [06_FRONTEND.md](06_FRONTEND.md) — comment on l'expose.
5. [07_RUNBOOK.md](07_RUNBOOK.md) — comment tout lancer.
