# 07 — Runbook : tout lancer en local

> Prérequis : macOS/Linux, Python 3.12 (`python3.12`), Node 20+. Le port 5000 est interdit sur macOS (AirDrop) — l'API utilise **8000**, le frontend **3000**.

## Installation (une fois)

```bash
make setup          # venv Python 3.12 + pip install ml & backend + npm install frontend
```

Équivalent manuel :
```bash
python3.12 -m venv .venv
.venv/bin/pip install -e ml -r backend/requirements.txt
cd frontend && npm install
```

## Démarrage

```bash
make api            # FastAPI -> http://localhost:8000 (Swagger: /docs)
make web            # Next.js -> http://localhost:3000
```

## Entraînement & benchmark

```bash
make train          # run par défaut (histgb + Platt, cv5) persisté dans data/artifacts/runs/
# ou en direct :
.venv/bin/python -m bob_corn_ml.cli train --model lightgbm --calibration sigmoid --feature-set full --folds 5
.venv/bin/python -m bob_corn_ml.cli train --model lightgbm --calibration isotonic
.venv/bin/python -m bob_corn_ml.cli train --model lightgbm --feature-set no_age   # ablation
.venv/bin/python -m bob_corn_ml.cli tune --model lightgbm --n-iter 10             # random search
.venv/bin/python -m bob_corn_ml.cli list                                          # liste des runs (* = actif)
```

Les benchmarks se lancent aussi **depuis le frontend** (`/labo`) — c'est le mode prévu pour itérer vite.

## Soumission Kaggle

```bash
make submission     # depuis le run actif -> data/submissions/submission_<ts>_<slug>.csv
.venv/bin/python -m bob_corn_ml.cli submission --run <run_id>   # depuis un run précis
```

Garanties intégrées : 14 303 lignes, ordre exact de `sample_submission.csv`, valeurs clippées [0,1], erreur si une ligne manque.

## Debug

| Symptôme | Cause probable / remède |
|---|---|
| `409 Aucun run actif` | Lancer `make train` d'abord |
| Front affiche « API hors ligne » | `make api` n'est pas lancé, ou port 8000 occupé (`lsof -i :8000`) |
| `lightgbm n'est pas installé` | Wheel absente pour la version Python → utiliser le venv 3.12 ou le modèle `histgb` |
| Features obsolètes après modif de `features.py` | Supprimer le cache : `rm data/processed/*.parquet` |
| Run bloqué en `running` après crash du serveur | Supprimer le run (`DELETE /api/lab/runs/{id}` ou supprimer le dossier) |
| `ls`/FS très lent à la racine | Sync iCloud sur `node_modules` — attendre ou exclure le dossier de la sync |

## Nettoyage

```bash
make clean          # purge data/processed, data/artifacts, frontend/.next
```
