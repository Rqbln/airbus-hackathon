# HAKS 2026 — Aircraft Corrosion Risk (Airbus × IBM × AWS)

Predict the **monthly corrosion probability** of commercial aircraft from
~12 years of environmental exposure data (weather, sea salt, gaseous pollutants,
parking time). Evaluation: **Brier score** — lower is better, naïve constant 0.5 = 0.25.

## Problem in one paragraph

For each test aircraft we have an environmental history (~100 months of 33 features).
We must produce a probability of corrosion for every month. The training labels follow
Airbus' convention:

- **target = 1** — the month of the first observed corrosion (`observation_date`)
- **target = 0** — the month exactly **24 months before** that observation

The challenge is therefore a **calibrated probabilistic binary classifier** that
distinguishes a corrosive environmental signature from a benign one.

## Repository layout

```
.
├── corrosions_training.csv          # raw data
├── environment_training.csv
├── environment_test.csv
├── sample_submission-3.csv
│
├── src/corrosion/                   # Python package (importable modules)
│   ├── config.py                    # paths, constants, key vars, windows
│   ├── data.py                      # CSV loaders
│   ├── target.py                    # Airbus (1, 0) pair construction
│   ├── features.py                  # FE: age, cumul, rolling, interactions
│   ├── validation.py                # GroupKFold CV + Brier/AUC
│   ├── models.py                    # LightGBM / XGBoost / CatBoost / HistGB / LogReg
│   ├── calibration.py               # sigmoid / isotonic
│   ├── inference.py                 # test-time prediction helpers
│   ├── submission.py                # build + save submissions
│   └── reporting.py                 # JSON/CSV reports for the dashboard
│
├── scripts/                         # runnable training pipelines
│   ├── 01_explore.py
│   ├── 02_train_baseline.py
│   ├── 03_train_feature_engineering.py
│   ├── 04_train_ensemble.py
│   └── 05_generate_dashboard_data.py
│
├── submissions/                     # generated CSV submissions
├── reports/                         # JSON/CSV reports consumed by the front
├── models/                          # (optional) pickled models
│
└── apps/web/                        # Next.js 14 dashboard (TS + Tailwind + Recharts)
    ├── app/
    │   ├── page.tsx                 # Dashboard
    │   ├── aircraft/                # Per-aircraft risk explorer
    │   ├── insights/                # Model insights (top features, fold scores)
    │   └── submission/              # Final submission preview + format check
    ├── components/                  # Card, Metric, charts/*
    └── lib/data.ts                  # reads reports/* at build time
```

## Modelling strategy

1. **Strict training set** — only the 571 aircraft for which **both** reference months
   (mois d'observation, mois − 24) exist in `environment_training`. That gives
   1142 perfectly balanced rows (571 positives, 571 negatives).
2. **Feature engineering — 33 → 150 features**, all anti-leakage:
   - `age_months`, `years_since_delivery`, cyclic `month_sin/cos`
   - **Cumulative exposure** since delivery: `cum_parking_minutes`, and dose-weighted
     cumuls `cum_sea_salt_exposure`, `cum_so2_exposure`, `cum_ozone_exposure`,
     `cum_humidity_exposure`, `cum_humidity_x_salt`, `cum_humidity_x_so2`, …
   - **Rolling 3/6/12/24 mean & max** on 12 critical variables (parking, humidity,
     sea salt, SO₂, O₃, NO₂, HNO₃, sulfate, temperature, …)
   - Point-in-time interactions: `humidity_x_salt`, `parking_x_humidity`, …
3. **Validation** — 5-fold `GroupKFold` keyed by `aircraft_id` so the (0,1) pair of
   any aircraft never splits between train and validation.
4. **Models compared**: LightGBM, XGBoost, CatBoost, HistGradientBoosting, calibrated
   Logistic Regression (interpretable baseline).
5. **Calibration** — `raw` / `sigmoid` / `isotonic` compared on OOF; best retained.
6. **Ensembling** — weighted average of the gradient-boosted models, weights ∝
   `1 / brier_oof`; final isotonic recalibration on OOF.

## Running the pipeline

```bash
# Python (3.10+) with pandas, numpy, scikit-learn, lightgbm, xgboost, catboost.
python scripts/01_explore.py
python scripts/02_train_baseline.py
python scripts/03_train_feature_engineering.py
python scripts/04_train_ensemble.py
python scripts/05_generate_dashboard_data.py

# Front (Node 18+)
cd apps/web
npm install
npm run dev
# then open http://localhost:3000
```

## Results (5-fold GroupKFold Brier — lower is better)

| Stage                                          | Brier OOF | Δ vs naïve (0.25) |
| ---------------------------------------------- | --------- | ----------------- |
| Naïve constant 0.5                             | 0.2500    | —                 |
| Baseline LightGBM (raw, 33 feat)               | 0.1979    | −20.8 %           |
| HistGradientBoosting + FE (150 feat)           | 0.1382    | −44.7 %           |
| LightGBM + FE                                  | 0.1262    | −49.5 %           |
| XGBoost + FE                                   | 0.1216    | −51.4 %           |
| CatBoost + FE (best single)                    | 0.1185    | −52.6 %           |
| CatBoost + FE + isotonic                       | 0.1153    | −53.9 %           |
| Weighted ensemble (LGBM/XGB/CB/HGB) raw        | 0.1211    | −51.6 %           |
| **Weighted ensemble + isotonic** (final)       | **0.1090**| **−56.4 %**       |

(Refreshed automatically; see `reports/model_metrics.json`.)

## Submissions produced

| File                              | Stage              |
| --------------------------------- | ------------------ |
| `submission_baseline.csv`         | raw features, calibrated LightGBM |
| `submission_fe_v1.csv`            | best single model + isotonic |
| `submission_best_model_raw.csv`   | best single model, no calibration |
| `submission_ensemble_v1.csv`      | final ensemble (recommended) |

## Dashboard

A 4-page Next.js dashboard reads the JSON/CSV reports at build time:

1. **Dashboard** — overview, model comparison bars, prediction histogram, Airbus convention.
2. **Aircraft Explorer** — per-aircraft month-by-month risk timeline with green/orange/red
   risk bands and the 10 highest-risk months.
3. **Model Insights** — Brier-by-model bar chart, fold-by-fold drill-down, top-30 feature
   importance.
4. **Submission** — file picker, preview, format check (rows, range, columns).

## Notes & next steps

- Avoid public LB overfit: the final ensemble is the safer pick.
- Possible extensions: per-aircraft LSTM on the monthly sequence; pseudo-labelling using
  the test months immediately before/after high-confidence test predictions; stacking
  of the GBMs with a logistic meta-learner.
