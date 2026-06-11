# 02 — Données : fichiers, dictionnaire, pièges

> Les CSV bruts vivent dans `data/raw/` (versionnés). Définition du target : [01_PROBLEM.md](01_PROBLEM.md).

## Fichiers

| Fichier | Lignes | Avions | Période | Rôle |
|---|---|---|---|---|
| `environment_training.csv` | 63 524 | 758 | 2014-04 → 2026-05 | Historique env mensuel — features d'entraînement |
| `corrosions_training.csv` | 790 | 790 | 2016-10 → 2026-05 | Date de première corrosion — source du target |
| `environment_test.csv` | 14 303 | 142 | 2014-03 → 2026-05 | Historique env de la flotte test — à prédire |
| `sample_submission.csv` | 14 303 | 142 | — | Gabarit de soumission (`id,corrosion_risk`) |
| `sample_submission_enriched.csv` | 14 303 | 142 | — | Variante 4 colonnes (`id,aircraft_id,year_month,corrosion_risk`) |

## Dictionnaire — `corrosions_training.csv`

| Colonne | Type | Sens |
|---|---|---|
| `aircraft_id` | hex string | Identifiant anonymisé |
| `observation_date` | date | Première corrosion observée |
| `aircraft_delivery_year` / `aircraft_delivery_month` | int | Mise en service (⚠️ absent côté test → ne pas utiliser comme feature) |

## Dictionnaire — `environment_*.csv` (36 colonnes, schéma identique train/test)

**Identifiants & temps** : `aircraft_id`, `year_month` (`YYYY-MM`), `month_start_date` (ISO).

**Exposition** : `total_parking_minutes` — la *dose* d'exposition ; la corrosion s'accumule à l'arrêt.

**Météo (METAR, capteurs aéroport)** : `metar_temperature_c`, `metar_relative_humidity` (%), `metar_dew_point_c`, `metar_wind_speed_kn`, `metar_visibility_mi`, `metar_hour_precipitation`.

**Aérosols (Copernicus, mixing ratios ~1e-9)** :
| Colonne | Rôle corrosion |
|---|---|
| `sea_salt_aerosol_003_05/05_5/5_20_mixing_ratio` | **Chlorure = accélérateur n°1** (piqûres + déliquescence) |
| `dust_aerosol_003_055/055_09/09_20_mixing_ratio` | Dépôts, cellules d'aération différentielle |
| `hydrophilic/hydrophobic_organic_matter_aerosol_mixing_ratio` | Aérosols organiques |
| `hydrophilic/hydrophobic_black_carbon_aerosol_mixing_ratio` | Suie conductrice = sites cathodiques |
| `sulphate_aerosol_mixing_ratio` | Acide, corrosif |

**Gaz & chimie (Copernicus)** : `sulphur_dioxide_mass_mixing_ratio` (SO₂ → acide sulfurique, driver majeur), `hno3` (acide nitrique), `nitrogen_monoxide/dioxide_mass_mixing_ratio`, `ozone_mass_mixing_ratio` + `h2o2` + `oh` (oxydants, convertissent SO₂ en acide), `organic_nitrates`, `ethane`, `c3h8`, `isoprene`, `formaldehyde`, `carbon_monoxide_mass_mixing_ratio` (empreintes géographiques, pas d'effet corrosif direct), `specific_humidity`, `temperature` (**Kelvin**).

## Pièges connus

1. **32 avions orphelins** dans `corrosions_training.csv` sans historique env → à supprimer (fait dans `targets.py`).
2. **Deux températures** : `temperature` est en Kelvin, `metar_temperature_c` en °C.
3. **Mixing ratios minuscules** (1e-9) et très asymétriques.
4. **Pas de date de livraison côté test** → l'âge est approximé par « mois depuis le premier relevé env » (identique train/test).
5. La jointure labels ↔ env doit être **as-of backward** (246 mois de référence sans ligne env exacte).
6. Ne jamais utiliser `feat_gap_months` / `exact_month` / `env_available` comme features (récence corrélée au label = leakage).
