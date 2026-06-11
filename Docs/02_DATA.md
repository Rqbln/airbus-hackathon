# 02 — Données

## Fichiers (`data/raw/`)

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `environment_training.csv` | 63 524 | Features mensuelles, 758 avions |
| `corrosions_training.csv` | 790 | Date 1ère corrosion par avion |
| `environment_test.csv` | 14 303 | 142 avions à scorer |
| `sample_submission.csv` | 14 303 | Template Kaggle (2 colonnes) |

## Pièges vérifiés

| Piège | Action |
|-------|--------|
| 32 avions dans corrosions sans env | **Exclure** |
| Train/test disjoints | 0 chevauchement d'`aircraft_id` |
| `(aircraft_id, year_month)` | Clé unique (0 doublon) |
| `temperature` (K) vs `metar_temperature_c` (°C) | Ne pas mélanger ; offset ~273 |
| 246 labels sans ligne env au mois exact | Flag `env_available=False` ; exclure si `drop_missing_env=True` |

## Colonnes `environment_*.csv` (36)

### Identifiants
- `aircraft_id`, `year_month`, `month_start_date`

### Exposition
- `total_parking_minutes`

### METAR
- `metar_temperature_c`, `metar_relative_humidity`, `metar_dew_point_c`, `metar_wind_speed_kn`, `metar_visibility_mi`, `metar_hour_precipitation`

### Aérosols (mixing ratios)
- `sea_salt_aerosol_*` (3 bins), `dust_aerosol_*` (3 bins), `sulphate_aerosol`, organiques, carbone noir

### Polluants gazeux
- `sulphur_dioxide_mass_mixing_ratio`, `nitrogen_dioxide_mass_mixing_ratio`, `ozone_mass_mixing_ratio`, `carbon_monoxide_mass_mixing_ratio`, etc.

## Colonnes `corrosions_training.csv`

- `aircraft_id`, `observation_date`, `aircraft_delivery_year`, `aircraft_delivery_month`
