# 03 — Feature engineering

Implémentation : `ml/src/corrotwin_ml/features.py`

## CEI (Corrosive Exposure Index) — proxy ISO 9223

```
total_sea_salt = sum(sea_salt_aerosol_*)
cei_monthly = total_parking_minutes
            × exp(0.046 × metar_relative_humidity)
            × (total_sea_salt + 100 × SO₂)
```

## Time-of-wetness proxy

```
tow_proxy = humidity × precipitation × parking_minutes / 1e6
```

## Agrégations (groupées par `aircraft_id`, causales)

| Type | Exemples |
|------|----------|
| Cumul | `cum_parking`, `cum_cei`, `cum_precip`, `cum_sea_salt` |
| Rolling mean/max | fenêtres 3, 6, 12, 24 mois sur CEI, humidité, parking |
| Lags | 1, 3, 6 mois sur humidité, SO₂, sel marin, CEI |
| Log1p | mixing ratios skewés (dust, ozone, SO₂, NO₂) |
| Âge | `aircraft_age_months` depuis date de livraison |

## Jeux de features (`feature_set`)

| Valeur | Contenu |
|--------|---------|
| `full` | Tout le pipeline |
| `base` | Sans rolling/lags/log1p |
| `cei_only` | CEI + cum_cei + sel + parking |

## Anti-leakage

Pour le mois `t`, toutes les stats utilisent uniquement les mois `≤ t` (rolling/lags/cumsum après tri chronologique par avion).
