# Architecture CorroTwin

```mermaid
flowchart LR
    subgraph dataLayer [data]
        raw[raw CSVs]
        processed[processed]
        runs[artifacts/runs]
        subs[submissions]
    end
    subgraph mlLayer [ml]
        targets[targets]
        features[features]
        train[train]
        predict[predict]
    end
    subgraph apiLayer [backend :8000]
        fleetAPI[fleet]
        labAPI[labo ML]
        roiAPI[roi]
    end
    subgraph uiLayer [frontend :3000]
        dash[dashboard]
        labo[labo]
        roi[simulateur]
    end
    raw --> targets --> features --> train --> runs
    features --> predict --> subs
    runs --> apiLayer
    mlLayer --> apiLayer
    apiLayer --> uiLayer
```

## Ports

| Service | Port |
|---------|------|
| FastAPI | 8000 |
| Next.js | 3000 |

## Démarrage

```bash
make setup
make train
make api   # terminal 1
make web   # terminal 2
```
