# 08 — Conventions du repo & extension

> Pour tout agent (humain ou IA) qui modifie ce projet.

## Structure

| Emplacement | Règle |
|---|---|
| `docs/` | Toute la documentation (sauf README.md racine). Mettre à jour le doc concerné **dans la même PR** que le code. |
| `data/raw/` | CSV bruts versionnés — ne jamais modifier en place |
| `data/processed/`, `data/artifacts/`, `data/submissions/` | Générés, gitignorés — ne jamais committer |
| `output/` | Sorties horodatées des notebooks (gitignoré pour les nouveaux fichiers) |
| `ml/` | Toute logique ML. Le backend ne fait **jamais** de ML lui-même, il appelle `bob_corn_ml`. |
| `backend/` | API uniquement : validation Pydantic, orchestration, lecture des artefacts |
| `frontend/` | UI uniquement : aucun calcul métier, tout vient de l'API |

## Style

- **Python** : 3.12, type hints, docstrings français, pas de commentaire évident. Modules courts à responsabilité unique.
- **TypeScript** : strict, types des réponses API centralisés dans `src/lib/api.ts`.
- **UI** : français exclusivement, palette de [06_FRONTEND.md](06_FRONTEND.md).
- Secrets : jamais en dur, `.env` gitignoré.

## Git

- Branche de travail : `mvp` → PR vers `main`.
- Messages de commit : préfixe `feat:` / `fix:` / `chore:` / `docs:`, impératif court.
- Ne jamais committer `data/processed`, `data/artifacts`, `node_modules`, `.venv`, `.next`.

## Étendre le projet — recettes

| Besoin | Marche à suivre |
|---|---|
| Ajouter un modèle ML | `REGISTRY` dans `ml/.../models.py` + `DEFAULT_PARAMS` et `ModelName` dans `config.py`. Dispo immédiatement en CLI/API/frontend. |
| Ajouter une feature | Fonction dans `features.py` (respecter la causalité §[03_FEATURES.md](03_FEATURES.md)), purger `data/processed/*.parquet`, relancer un run. |
| Ajouter une métrique | `metrics.py::compute_all_metrics` → persistée automatiquement dans chaque nouveau run ; l'afficher dans `/labo`. |
| Ajouter un endpoint | Router dans `backend/app/routers/` + schéma Pydantic + doc dans [05_API.md](05_API.md). |
| Ajouter une page front | `frontend/src/app/<route>/page.tsx` + entrée de navigation + doc dans [06_FRONTEND.md](06_FRONTEND.md). |
| Changer la convention de target | `targets.py` (OFFSET_MONTHS) — purger le cache parquet ensuite. |

## Pièges d'environnement connus

- Le venv doit être en **Python 3.12** (wheels LightGBM). Un `.venv` 3.14 résiduel casse pyarrow/lightgbm.
- macOS : FS insensible à la casse — ne jamais créer `Data/` et `data/` distincts ; tout est en minuscules.
- Le dossier projet peut être synchronisé iCloud : `node_modules` peut ralentir le FS.
