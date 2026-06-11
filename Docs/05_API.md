# 05 — API FastAPI

Base URL : `http://localhost:8000`

## Santé

`GET /health` → `{"status": "operational", "version": "1.0.0"}`

## Flotte

`GET /api/metrics` — métriques du run actif (Brier, AUC, ECE)

`GET /api/fleet/risk` — liste des 142 avions test avec risque calibré et tier (Faible / Moyen / Élevé)

## Aéronef

`GET /api/aircraft/{aircraft_id}` — série temporelle CEI + risque

## Labo ML

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/lab/runs` | Lance un entraînement (body: RunConfigRequest) |
| GET | `/api/lab/runs` | Liste tous les runs |
| GET | `/api/lab/runs/{id}` | Détail d'un run |
| GET | `/api/lab/compare?run_a=&run_b=` | Comparaison |
| POST | `/api/lab/runs/{id}/activate` | Définit le modèle actif |
| GET | `/api/lab/active` | Run actif |
| POST | `/api/lab/runs/{id}/submission` | Télécharge CSV Kaggle |

### Exemple POST /api/lab/runs

```json
{
  "model_name": "histgb",
  "calibration": "sigmoid",
  "feature_set": "full",
  "n_splits": 5,
  "tune": false,
  "notes": ""
}
```

## ROI

`POST /api/roi/simulate`

```json
{
  "fleet_size": 142,
  "avg_downtime_cost_per_hour": 15000,
  "ccheck_extension_days": 3,
  "high_risk_aircraft_count": 10,
  "software_implementation_cost": 250000
}
```
