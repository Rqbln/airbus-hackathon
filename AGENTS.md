# Bob-corn — guide agent

Contexte complet du projet dans **`docs/`** — commencer par [`docs/llms.txt`](docs/llms.txt) (index) puis [`docs/00_INDEX.md`](docs/00_INDEX.md).

Règles essentielles :
- UI exclusivement en **français** ; palette et style : `docs/06_FRONTEND.md`.
- Toute la logique ML vit dans `ml/` (package `bob_corn_ml`) ; le backend ne fait que l'exposer ; le frontend ne calcule rien.
- Anti-leakage strict : voir `docs/03_FEATURES.md` (GroupKFold par avion, colonnes bloquées, causalité).
- Ports : API 8000, frontend 3000, jamais 5000 (macOS).
- Commandes : `make setup / train / api / web / submission` (`docs/07_RUNBOOK.md`).
- Conventions de code et recettes d'extension : `docs/08_CONVENTIONS.md`.
