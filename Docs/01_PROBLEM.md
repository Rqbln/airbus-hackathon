# 01 — Problème et métrique

## Objectif

Estimer `corrosion_risk ∈ [0, 1]` : probabilité de corrosion pour chaque couple `(aircraft_id, year_month)` à partir de l'historique d'exposition environnementale au sol.

## Métrique : Brier score

```
BS = (1/N) Σ (p_i - y_i)²
```

| Référence | Brier |
|-----------|-------|
| Prédiction constante 0.5 | **0.25** (baseline à battre) |
| Prédictions parfaites | 0.0 |

La calibration des probabilités est **critique** : ROC-AUC seul ne suffit pas.

## Convention target (Airbus)

Pour chaque avion d'entraînement avec date d'observation `observation_date` :

| Mois | Label |
|------|-------|
| Mois de l'observation | **1** |
| Exactement **24 mois avant** | **0** |

→ ~1 516 lignes labellisées (758 paires équilibrées).

## Validation

- **GroupKFold** groupé par `aircraft_id` (jamais le même avion en train et validation).
- Pas de split aléatoire par ligne.

## Soumission Kaggle

- Fichier : `id,corrosion_risk` avec `id = {aircraft_id}_{year_month}`
- 14 303 lignes (toutes les lignes `environment_test.csv`)
- Seules les dates de référence cachées sont scorées, mais toutes les lignes doivent avoir une valeur ∈ [0, 1]

## Vision produit

CorroTwin traduit les probabilités en actions MRO : C-check ciblé, prévention proactive, rotation de flotte.
