# HAKS 2026 — Dashboard

Next.js 14 + TypeScript + Tailwind + Recharts.

```bash
npm install
npm run dev
# open http://localhost:3000
```

The dashboard reads JSON/CSV files from `../../reports/` at build time. Generate them
with the Python pipeline first:

```bash
cd ../..
python scripts/02_train_baseline.py
python scripts/03_train_feature_engineering.py
python scripts/04_train_ensemble.py
python scripts/05_generate_dashboard_data.py
```

## Pages

- `/` — global overview (Brier comparison, prediction histogram, target convention)
- `/aircraft` — per-aircraft corrosion timeline (dropdown across 142 test aircraft)
- `/insights` — model rankings, fold scores, top 30 feature importance
- `/submission` — final submission file preview + format checks
