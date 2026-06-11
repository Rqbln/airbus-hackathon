# 08 — Conventions

## Structure

Nouveau code applicatif dans `ml/`, `backend/`, `frontend/` — pas de modification des notebooks existants sauf chemins `data/raw`.

## Données

- Source unique : `data/raw/`
- Artefacts ML : `data/artifacts/` (gitignored)
- Soumissions : `data/submissions/` (gitignored)

## Git

- Branche feature : `mvp` → PR vers `main`
- `.gitignore` : `.env`, `_*/`, `node_modules`, `.venv`, artefacts

## Extension

1. Feature ML → `features.py` + doc `03_FEATURES.md`
2. Endpoint API → router dans `backend/app/routers/` + doc `05_API.md`
3. Page UI → `frontend/src/app/` + doc `06_FRONTEND.md`
4. Mettre à jour `docs/llms.txt` si nouveau document

## Agents IA

Point d'entrée : [`AGENTS.md`](../AGENTS.md) → [`llms.txt`](llms.txt)
