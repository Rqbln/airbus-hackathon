# CorroTwin — Prédiction du risque de corrosion aéronef

Plateforme MRO full-stack pour le hackathon HAKS 2026 (Airbus × IBM × AWS).

## Architecture

```
data/raw → ml (features, train) → backend FastAPI → frontend Next.js
```

Voir [Architecture.md](Architecture.md) et [docs/00_INDEX.md](docs/00_INDEX.md).

## Démarrage rapide

```bash
make setup
make train
make api   # terminal 1 — http://localhost:8000
make web   # terminal 2 — http://localhost:3000
```

## Résultats attendus

| Métrique | Valeur typique |
|----------|----------------|
| Baseline Brier (0.5) | 0.25 |
| HistGB + Platt OOF | **< 0.25** (ex. ~0.03) |
| Soumission | 14 303 lignes |

## Pages

- **/** — Dashboard flotte (142 avions)
- **/labo** — Benchmark ML, métriques, soumission Kaggle
- **/aeronef/[id]** — Jumeau numérique CEI / risque
- **/roi** — Simulateur d'impact financier

## Documentation agents IA

[`AGENTS.md`](AGENTS.md) → [`docs/llms.txt`](docs/llms.txt)

## Stack

| Couche | Technologie |
|--------|-------------|
| ML | Python, scikit-learn, HistGB/LightGBM |
| API | FastAPI, uvicorn |
| UI | Next.js, shadcn/ui, Recharts, Tailwind |
