# Architecture — Bob-corn

Prédiction du risque de corrosion des voilures d'aéronefs à partir de l'exposition environnementale au sol (HAKS 2026 — Airbus × IBM × AWS). Application 100 % locale : pipeline ML Python, API FastAPI (port 8000), frontend Next.js (port 3000).

## Vue d'ensemble

```mermaid
flowchart LR
    subgraph dataDir [data/]
        raw["raw/ — CSV bruts du challenge"]
        processed["processed/ — features/labels générés"]
        runs["artifacts/runs/ — un dossier par run (config, métriques, modèle)"]
        subs["submissions/ — CSV Kaggle"]
    end
    subgraph mlPkg [ml/ — bob_corn_ml]
        targets["targets.py — paires y=1/y=0 (offset 24 mois)"]
        feats["features.py — physics-informed (TOW, Arrhenius, doses, ISO 9223)"]
        registry["models.py — registre lightgbm/histgb/logreg/constant"]
        train["train.py — GroupKFold + calibration + métriques OOF"]
        predict["predict.py — inférence test + soumission Kaggle"]
    end
    subgraph apiSrv [backend/ — FastAPI :8000]
        fleet["/api/fleet/risk, /api/aircraft/{id}"]
        lab["/api/lab/* — runs, benchmark, comparaison"]
        roi["/api/roi/simulate"]
    end
    subgraph front [frontend/ — Next.js :3000, FR]
        dash["/ Tableau de bord flotte"]
        twin["/aeronef/[id] Jumeau numérique"]
        labUI["/labo Labo ML / benchmark"]
        roiUI["/roi Simulateur ROI"]
    end
    raw --> targets --> feats --> train --> runs
    feats --> predict --> subs
    runs --> apiSrv
    apiSrv --> front
```

## Flux d'un benchmark depuis le frontend

```mermaid
sequenceDiagram
    participant UI as Frontend /labo
    participant API as FastAPI
    participant ML as bob_corn_ml
    UI->>API: POST /api/lab/runs (config du modèle)
    API->>ML: BackgroundTask train(config)
    API-->>UI: run_id (statut pending)
    loop polling
        UI->>API: GET /api/lab/runs/{run_id}
        API-->>UI: statut + métriques quand done
    end
    UI->>API: POST /api/lab/runs/{run_id}/submission
    API-->>UI: CSV Kaggle téléchargeable
```

## Dossiers

| Dossier | Rôle |
|---|---|
| `data/raw/` | CSV du challenge (versionnés) |
| `data/processed/`, `data/artifacts/`, `data/submissions/` | Générés, non versionnés |
| `ml/` | Package Python `bob_corn_ml` (pipeline complet) |
| `backend/` | API FastAPI |
| `frontend/` | Application Next.js + shadcn/ui (français) |
| `docs/` | Documentation projet (conçue pour les agents IA — voir `docs/llms.txt`) |
| `notebooks/` | Travaux d'investigation (01→05) |
| `output/` | Sorties horodatées des notebooks |

Voir `docs/00_INDEX.md` pour la documentation complète.
