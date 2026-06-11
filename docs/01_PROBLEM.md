# 01 — Problème, métrique, convention de target

> Source de vérité sur la définition du problème. Détails données : [02_DATA.md](02_DATA.md). Analyse d'origine (anglais) : [problem-analysis.md](problem-analysis.md).

## Énoncé

La corrosion des voilures est un phénomène électrochimique progressif piloté par l'environnement de stationnement **au sol** : humidité, sel marin, polluants, température, temps de parking. Un avion passe ~2/3 de sa vie stationné. Objectif : à partir de l'historique environnemental mensuel d'un avion, estimer sa **probabilité de corrosion** `corrosion_risk ∈ [0, 1]`.

## Métrique : Brier score

\[ Brier = \frac{1}{N} \sum (p_i - y_i)^2 \]

| Référence | Brier |
|---|---|
| Constante 0.5 partout | **0.2500** — la baseline à battre |
| Prédiction parfaite calibrée | 0.0 |
| Pipeline actuel (LightGBM + Platt, OOF cv5) | **≈ 0.151** |

Conséquences directes :
- La **calibration compte autant que la discrimination** : un modèle bien classé mais mal calibré est pénalisé.
- Leaderboard public sur la moitié des points, privé sur l'autre moitié → ne pas suroptimiser le public.

## Convention de target (officielle Airbus)

Pour chaque avion de `corrosions_training.csv` :

| Mois de référence | Label | Justification |
|---|---|---|
| Mois de `observation_date` | **y = 1** | Corrosion confirmée |
| Exactement **24 mois plus tôt** | **y = 0** | Phénomène non linéaire à déclenchement tardif : supposé sain 2 ans avant |

- 758 avions utilisables → **1 516 lignes labellisées équilibrées** (758/758).
- Le point « −24 mois = sain » est une *hypothèse* du challenge, traitée comme vérité pour le scoring.
- Implémentation : `ml/src/corrotwin_ml/targets.py` (port du notebook `02_target_construction.ipynb`).

## Cœur de la difficulté

On connaît l'historique env des **142 avions de test** mais **pas leurs dates d'observation**. Le mois y=0 et le mois y=1 d'un même avion partagent souvent le *même climat* : ce qui les sépare est la **dose accumulée** (intégrale de l'exposition) — d'où le feature engineering cumulatif ([03_FEATURES.md](03_FEATURES.md)).

## Soumission

- Fichier : colonnes `id,corrosion_risk`, **14 303 lignes**, ordre exact de `data/raw/sample_submission.csv`.
- `id` = `{aircraft_id}_{year_month}` (ex. `74b7d1_2020-01`).
- On prédit **toutes** les lignes ; seules les deux dates de référence cachées par avion sont scorées.
- Valeurs strictement dans [0, 1] (clip).
- Génération : `make submission` (voir [07_RUNBOOK.md](07_RUNBOOK.md)).

## Faits vérifiés (à ne pas redécouvrir)

- ✅ Les 758 avions de `environment_training.csv` ont tous un enregistrement corrosion.
- ⚠️ `corrosions_training.csv` liste 790 avions : **32 sans aucun historique env** → supprimés.
- ✅ Flottes train et test **totalement disjointes**.
- ✅ `(aircraft_id, year_month)` unique dans les deux fichiers env (0 doublon).
- ✅ Deux colonnes de température : `temperature` (Kelvin) et `metar_temperature_c` (°C), offset ≈ 273 vérifié.
- ⚠️ 246 lignes de labels sans donnée env au mois exact (104 y=0, 142 y=1) → conservées via jointure as-of backward ; ~147 sans aucun historique antérieur → NaN gérés nativement par les boosters.
