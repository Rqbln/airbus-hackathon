# 05 — API FastAPI (port 8000)

> Implémentation : `backend/app/`. Swagger interactif : `http://localhost:8000/docs`. Démarrage : `make api` ([07_RUNBOOK.md](07_RUNBOOK.md)).

## Santé & métriques

### `GET /health`
```json
{"status": "operational", "version": "1.0.0", "active_run": "20260611_173906_lightgbm_full_isotonic_cv5"}
```

### `GET /api/metrics`
Métriques complètes du run actif : `{"active_run": "...", "config": {...}, "metrics": {...}}` (contenu de `metrics.json`, voir [04_ML_PIPELINE.md](04_ML_PIPELINE.md)).

## Flotte

### `GET /api/fleet/risk`
Risque au dernier mois connu pour chacun des 142 avions, trié par risque décroissant.
```json
{
  "run_id": "...", "fleet_size": 142, "n_high": 96, "n_medium": 16, "n_low": 30,
  "mean_risk": 0.724,
  "aircraft": [{"aircraft_id": "fb737b", "latest_year_month": "2025-09",
                "risk": 1.0, "tier": "eleve", "months_observed": 72}]
}
```
Tiers : `eleve` ≥ 0.75, `moyen` ≥ 0.40, `faible` < 0.40.

### `GET /api/aircraft/{aircraft_id}`
Jumeau numérique : série temporelle complète (risque + exposition).
```json
{
  "aircraft_id": "fb737b", "run_id": "...", "latest_risk": 1.0, "tier": "eleve",
  "timeline": [{"year_month": "2022-04", "risk": 0.375, "cei": 7.07e-08,
                "cei_cum": 1.43e-05, "humidity": 67.3, "chloride": 4.98e-09,
                "so2": 8.43e-10, "parking_hours": 448.5}]
}
```
`cei` = `corrosivity_increment` (indice ISO 9223 mensuel) ; `cei_cum` = cumul.

## Labo ML

### `GET /api/lab/options`
Modèles disponibles, jeux de features, calibrations, config par défaut — alimente le formulaire du frontend.

### `POST /api/lab/runs` — lance un benchmark (asynchrone)
```json
// requête
{"name": "essai", "model": "lightgbm", "model_params": {}, "feature_set": "full",
 "calibration": "sigmoid", "n_splits": 5, "seed": 42, "notes": ""}
// réponse
{"run_id": "20260611_..._lightgbm_full_sigmoid_cv5", "status": "pending"}
```
L'entraînement s'exécute en tâche de fond (un à la fois). Suivre via GET runs/{id}.

### `GET /api/lab/runs`
`{"active_run": "...", "runs": [{run_id, status, error, config, is_active, summary: {brier, brier_uncalibrated, log_loss, auc, ece, brier_per_fold_mean/std, n_features, duration_seconds, delta_vs_baseline}}]}`

### `GET /api/lab/runs/{run_id}`
Run complet avec `metrics` intégral (courbe de calibration, histogramme, importances…).

### `POST /api/lab/runs/{run_id}/activate`
Définit le run comme actif (alimente dashboard + ROI). 409 si non terminé.

### `DELETE /api/lab/runs/{run_id}`
Supprime le run et ses artefacts.

### `GET /api/lab/compare?a={run_id}&b={run_id}`
`{"a": {...run complet...}, "b": {...}}` — diff de config et de métriques côté frontend.

### `POST /api/lab/runs/{run_id}/submission`
Génère et renvoie le CSV Kaggle (téléchargement direct, fichier aussi écrit dans `data/submissions/`).

## ROI

### `POST /api/roi/simulate`
```json
// requête (tous les champs optionnels, défauts affichés)
{"fleet_size": 142, "avg_downtime_cost_per_hour": 15000, "ccheck_extension_days": 3,
 "inspection_labor_rate": 120, "inspection_hours_saved_per_aircraft": 40,
 "software_implementation_cost": 250000, "high_risk_aircraft": null}
// réponse
{"high_risk_aircraft": 96, "avoided_downtime_hours": 6912, "downtime_savings_usd": 103680000,
 "inspection_savings_usd": 460800, "total_savings_usd": 104140800,
 "roi_percentage": 41556.3, "assumptions": {...}}
```
Si `high_risk_aircraft` est null, il est lu depuis les prédictions du run actif (seuil 0.75).

## Codes d'erreur

| Code | Cas |
|---|---|
| 404 | Run ou avion inconnu |
| 409 | Aucun run actif / run non terminé |
| 500 | Échec de génération de soumission |
