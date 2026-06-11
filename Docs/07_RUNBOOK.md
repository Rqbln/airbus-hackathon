# 07 — Runbook

## Prérequis

- Python 3.10+ (3.14 OK, LightGBM indisponible → fallback HistGB)
- Node.js 18+
- macOS : ne pas utiliser le port 5000

## Installation

```bash
make setup
```

## Entraînement

```bash
make train-baseline   # constante 0.5, Brier = 0.25
make train            # HistGB + Platt (défaut)
```

## Démarrage

Terminal 1 :
```bash
make api    # http://localhost:8000
```

Terminal 2 :
```bash
make web    # http://localhost:3000
```

## Soumission Kaggle

```bash
make submission
# → data/submissions/submission_<timestamp>.csv
```

Ou depuis le Labo ML : bouton **CSV** sur un run.

## Vérifications

| Check | Commande / attente |
|-------|-------------------|
| Brier OOF < 0.25 | `metrics.json` du run actif |
| Soumission 14 303 lignes | `wc -l data/submissions/*.csv` → 14304 |
| API | `curl localhost:8000/health` |
| Frontend | Ouvrir `/labo`, voir les runs |

## Debug

- **API 503** : aucun modèle actif → `make train`
- **CORS** : frontend doit être sur `:3000`
- **Entraînement long** : ~30-60s pour HistGB full features sur CPU
