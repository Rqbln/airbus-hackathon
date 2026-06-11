# Bob-corn — Gestion prédictive de la corrosion des voilures

Solution full-stack **100 % locale** pour le hackathon HAKS 2026 (Airbus × IBM × AWS) : prédire la probabilité de corrosion des voilures d'aéronefs à partir de leur historique d'exposition environnementale au sol, et transformer cette prédiction en outil opérationnel pour un MRO.

| Composant | Stack | Port |
|---|---|---|
| Pipeline ML | Python 3.12 · LightGBM/HistGB · scikit-learn | — |
| API | FastAPI | **8000** |
| Frontend | Next.js (App Router) · shadcn/ui · Recharts — UI en français | **3000** |

**Performance pipeline intégré** : Brier OOF **≈ 0.150** (GroupKFold 5 par avion, calibration mesurée) vs baseline 0.25 — AUC ≈ 0.86.

## Modèle final Kaggle

Le notebook [`ml/final_model.ipynb`](ml/final_model.ipynb) est la **référence du dernier modèle soumis** : feature engineering mécanistique étendu, benchmark multi-modèles (HistGB / LightGBM / XGBoost / CatBoost…), calibration sigmoid, export soumission.

**Meilleur score public Kaggle : Brier 0.21038** (leaderboard sur 1 % du dataset de test).

```bash
# Depuis la racine du repo, avec Jupyter :
jupyter notebook ml/final_model.ipynb
```

## Démarrage rapide

```bash
make setup        # venv Python 3.12 + dépendances + npm install
make train        # entraîne un premier modèle (run persisté)
make api          # FastAPI sur http://localhost:8000
make web          # Next.js sur http://localhost:3000
make submission   # génère le CSV Kaggle depuis le meilleur run
```

## Les 4 écrans

1. **`/` Tableau de bord flotte** — KPI (flotte, avions à risque ≥ 75 %, Brier du modèle actif, économies projetées) + table triable des 142 aéronefs.
2. **`/aeronef/[id]` Jumeau numérique** — dose de corrosivité cumulée (indice ISO 9223) vs risque calibré, exposition du dernier mois.
3. **`/labo` Labo ML** *(le différenciateur)* — configurer un benchmark (modèle, features, calibration, folds), le lancer depuis le navigateur, suivre le run, puis comparer tous les runs : Brier (calibré/brut), log-loss, AUC, ECE, Brier par fold, décomposition calibration/discrimination, courbe de calibration, distribution des prédictions, importance des features, comparaison A/B, activation du modèle, export de la soumission Kaggle.
4. **`/roi` Simulateur ROI** — hypothèses ajustables (coût AOG, jours évités…) → impact financier en direct.

## Approche ML (résumé)

- **Target** : convention Airbus — mois d'observation = y=1, même mois −24 mois = y=0 → 1 516 lignes équilibrées (758 avions).
- **Features physics-informed (85)** : la corrosion = électrolyte × ions agressifs × temps, multiplicatifs et intégrés (time-of-wetness ISO 9223, facteur d'Arrhenius, doses sel/acide, cumuls et fenêtres 6/12/24 mois, empreintes de localisation).
- **Validation honnête** : GroupKFold par avion, calibration ajustée en OOF croisé, colonnes de récence bloquées (anti-leakage).
- **Benchmark systématique** : chaque entraînement est un *run* persisté (`data/artifacts/runs/`) avec config + métriques complètes + modèle — comparables depuis le frontend.

## Documentation

Toute la documentation (pensée aussi pour les agents IA) est dans [`docs/`](docs/llms.txt) : problème, données, features, pipeline ML, API, frontend, runbook, conventions. Architecture détaillée : [`Architecture.md`](Architecture.md).
