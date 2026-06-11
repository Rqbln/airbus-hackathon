# Problem & Data Analysis — Aircraft Corrosion Risk Prediction

> Competition: **`haks-airbus-x-ibm-x-aws-2026`** (Airbus × IBM × AWS)
> This document analyzes the problem, the provided data, and the target, then lays out the steps to a solution. It is the reference spec for the project.

---

## 1. Problem statement

Corrosion is a progressive phenomenon driven by the environment an aircraft is exposed to **on the ground**: humidity, sea salt, pollutants, temperature, and time spent parked. An aircraft spends roughly two-thirds of its life parked, so its corrosion risk is largely a function of *where* it has been parked and *for how long*.

**Objective:** From an aircraft's monthly environmental exposure history, estimate its **corrosion probability** `corrosion_risk ∈ [0, 1]`.

**Evaluation:** [Brier Score](https://en.wikipedia.org/wiki/Brier_score) — the mean squared error between the predicted probability and the true 0/1 outcome. Lower is better.

| Reference | Brier score |
|---|---|
| Constant `0.5` for everything | `0.25` — the baseline to beat |
| Perfect calibrated predictions | `0.0` |

Scoring is split: a **public leaderboard** on half the points (live during the challenge) and a **private leaderboard** on the other half (revealed at the close — this decides the final ranking). The split is a warning not to overfit the public score.

---

## 2. The core challenge

We are given the environmental history of **142 test aircraft**, but **not their corrosion observation dates**. The difficulty is therefore to learn the *signature* of an at-risk environment from the training aircraft and recognize it in the test aircraft — without ever being told which test months are actually corroded.

---

## 3. The data

Three CSV files (in [`Data/`](../Data/)). Figures below were verified directly from the files.

| File | Rows | Unique aircraft | Period | Role |
|---|---|---|---|---|
| `environment_training.csv` | 63,524 | 758 | 2014-04 → 2026-05 | Monthly environmental history of training aircraft — **features** |
| `corrosions_training.csv` | 790 | 790 | 2016-10 → 2026-05 | First-corrosion date per training aircraft — **target source** |
| `environment_test.csv` | 14,303 | 142 | 2014-03 → 2026-05 | Monthly environmental history of test aircraft — **predict on these** |

> `sample_submission.csv` (the row template you submit) is generated/downloaded separately from Kaggle and is the single source of truth for which rows the file must contain.

### 3.1 Verified data-linkage facts

These were checked against the raw CSVs and directly affect preprocessing:

- ✅ All **758** aircraft in `environment_training.csv` have a corrosion record.
- ⚠️ `corrosions_training.csv` lists **790** aircraft — **32 have no environment history** at all. They are unusable and **must be dropped**.
- ✅ Training and test aircraft are **fully disjoint** (0 overlap).
- ✅ Training aircraft were delivered **2015–2024** (range computed from `corrosions_training.csv`).
- ✅ Each environment row is **one aircraft in one month** — `(aircraft_id, year_month)` is unique in both files (0 duplicates).
- ✅ Two temperature columns exist — `temperature` (Kelvin) and `metar_temperature_c` (°C); confirmed by a near-constant ≈273 offset between them.

---

## 4. Data dictionary

### 4.1 `corrosions_training.csv` — target source

One row per training aircraft. Used **only** to build labels, never as a feature.

| Column | Type | Meaning |
|---|---|---|
| `aircraft_id` | string (hex) | Anonymized aircraft identifier |
| `observation_date` | date `YYYY-MM-DD` | Date the **first** corrosion was observed |
| `aircraft_delivery_year` | int | Year the aircraft entered service |
| `aircraft_delivery_month` | int | Month the aircraft entered service |

### 4.2 `environment_*.csv` — features

Identical 36-column schema for train and test. Each row = one aircraft's exposure for one calendar month, derived from where it was parked (METAR airport sensors + Copernicus satellite atmospheric data).

**Identifiers & time**

| Column | Meaning |
|---|---|
| `aircraft_id` | Aircraft identifier (joins to corrosion table) |
| `year_month` | Month key, `YYYY-MM` |
| `month_start_date` | ISO timestamp of the month's first day |

**Exposure / activity**

| Column | Meaning | Why it matters |
|---|---|---|
| `total_parking_minutes` | Minutes parked on the ground that month | Exposure **dose** — corrosion accumulates while parked |

**Weather (METAR — airport ground sensors)**

| Column | Meaning |
|---|---|
| `metar_temperature_c` | Air temperature (°C) |
| `metar_relative_humidity` | Relative humidity (%) — key corrosion driver |
| `metar_dew_point_c` | Dew point (°C) — proxy for condensation / time-of-wetness |
| `metar_wind_speed_kn` | Wind speed (knots) |
| `metar_visibility_mi` | Visibility (miles) |
| `metar_hour_precipitation` | Precipitation (per-hour measure) |

**Aerosols (Copernicus — mixing ratios)** — salt & particulates that drive/accelerate corrosion

| Column | Meaning |
|---|---|
| `sea_salt_aerosol_003_05_mixing_ratio` | Sea salt, 0.03–0.5 µm — **chloride = major accelerator** |
| `sea_salt_aerosol_05_5_mixing_ratio` | Sea salt, 0.5–5 µm |
| `sea_salt_aerosol_5_20_mixing_ratio` | Sea salt, 5–20 µm |
| `dust_aerosol_003_055_mixing_ratio` | Mineral dust, 0.03–0.55 µm |
| `dust_aerosol_055_09_mixing_ratio` | Mineral dust, 0.55–0.9 µm |
| `dust_aerosol_09_20_mixing_ratio` | Mineral dust, 0.9–20 µm |
| `hydrophilic_organic_matter_aerosol_mixing_ratio` | Water-attracting organic aerosol |
| `hydrophobic_organic_matter_aerosol_mixing_ratio` | Water-repelling organic aerosol |
| `hydrophilic_black_carbon_aerosol_mixing_ratio` | Water-attracting black carbon (soot) |
| `hydrophobic_black_carbon_aerosol_mixing_ratio` | Water-repelling black carbon |
| `sulphate_aerosol_mixing_ratio` | Sulphate aerosol — acidic, corrosive |

**Gaseous pollutants & chemistry (Copernicus — mixing ratios)**

| Column | Meaning |
|---|---|
| `ethane` | Ethane (C₂H₆) |
| `c3h8` | Propane |
| `isoprene` | Isoprene (biogenic VOC) |
| `carbon_monoxide_mass_mixing_ratio` | Carbon monoxide |
| `ozone_mass_mixing_ratio` | Ozone (O₃) — oxidant |
| `h2o2` | Hydrogen peroxide (oxidant) |
| `formaldehyde` | Formaldehyde (HCHO) |
| `hno3` | Nitric acid — acidic, corrosive |
| `nitrogen_monoxide_mass_mixing_ratio` | NO |
| `nitrogen_dioxide_mass_mixing_ratio` | NO₂ |
| `oh` | Hydroxyl radical |
| `organic_nitrates` | Organic nitrates |
| `sulphur_dioxide_mass_mixing_ratio` | SO₂ — forms acid, strong corrosion driver |
| `specific_humidity` | Specific humidity (kg water / kg air) |
| `temperature` | Temperature (Kelvin) |

---

## 5. The target — how `corrosion_risk` is defined

Airbus' official convention gives **two labeled reference months per training aircraft**, derived from `observation_date`:

| Reference month | Label | Rationale |
|---|---|---|
| Month of `observation_date` | **1** | Corrosion confirmed present |
| Exactly **24 months earlier** | **0** | Assumed corrosion-free 2 years prior (the phenomenon is non-linear / late-onset) |

Each usable training aircraft therefore yields **one positive and one negative** example → ~**1,516 balanced labeled rows** from 758 aircraft.

> Caveat: the "24-months-earlier = healthy" point is an *assumption*, not measured ground truth. For scoring it is treated as truth, so the model should predict **low** for the early month and **high** for the observation month.

**Building the training set**

1. For each aircraft in `corrosions_training.csv`, compute `obs_month` (the observation date truncated to month) and `obs_month − 24 months`.
2. Join both `(aircraft_id, year_month)` keys to `environment_training.csv` to fetch their feature rows.
3. Label the observation month `1` and the −24-month row `0`.
4. Drop the 32 aircraft with no environment match, plus any aircraft whose −24-month row is missing.

---

## 6. Model input / output

**One row in → one probability out.** The model never takes "two dates" as input — it scores a single (aircraft, month) at a time.

```
            ┌─────────────────────────────────────────┐
(aircraft,  │  features: 33 env vars + engineered      │
 month)  →  │  history (cumulative exposure, age, …)   │  →  corrosion_risk ∈ [0,1]
            └─────────────────────────────────────────┘
                    probability classifier
```

**Input** — the feature vector for a single (aircraft, month): the 33 environmental columns (everything except the 3 ID/time columns), plus recommended engineered features:
- **Cumulative / trailing-window exposure** up to that month (e.g. `total_parking_minutes` × corrosiveness summed over the prior 6 / 12 / 24 months) — corrosion is an *accumulated dose*, not a single-month snapshot.
- Trailing averages of humidity, dew point, sea-salt, SO₂.
- Aircraft **age** at that month (from delivery date).

**Output** — a single **calibrated probability** in `[0, 1]`, not a hard 0/1. The Brier score rewards calibration, so prefer probabilistic models and consider post-hoc calibration (Platt / isotonic).

---

## 7. Submission & evaluation

You predict a `corrosion_risk` for **every row of `environment_test.csv`** (each aircraft × month). The file must contain **exactly the rows in `sample_submission.csv`**, with two columns:

```
id,corrosion_risk
894378_2018-08,0.87
894378_2016-08,0.04
...
```

- `id` = `{aircraft_id}_{year_month}`.
- `corrosion_risk` = predicted probability in `[0, 1]`.

**Submit everything, but only some rows are scored.** You provide a probability for every test row, yet the Brier score is computed only on the **two reference dates per aircraft** that have a hidden 0/1 label. The remaining rows still need a value (the column must be complete) but do not affect the score.

> Confirm against the real `sample_submission.csv` once generated: check its **row count** (≈14,303 = every row, vs. 284 = two-per-aircraft) and that every `id` resolves to a row present in `environment_test.csv`.

---

## 8. Key takeaways for modeling

- **Drop the 32** corrosion records with no environment history.
- **Calibration over accuracy** — validate directly against Brier, and use **aircraft-level (grouped) cross-validation** so the same aircraft never appears in both train and validation folds.
- **Cumulative framing is the edge.** A "healthy" (−24 month) row and a "corroded" row can have similar *single-month* weather; the real difference is *accumulated* exposure. Engineer history features.
- **Time-of-wetness signal:** humidity + dew point + precipitation + parking time together approximate how long surfaces stay wet — the dominant physical corrosion driver.
- **Avoid leakage:** never let a test aircraft's "future" months inform its scored month if you build history features causally.

---

## 9. Next steps

- [ ] **EDA** — distributions, missing values, class balance, correlation of environmental drivers with the label; sanity-check the 24-month convention against the data.
- [ ] **Target construction** — implement the (1 / 0) pair builder from §5; verify ~1,516 rows.
- [ ] **Feature engineering** — cumulative/trailing exposure windows, aircraft age, time-of-wetness proxies.
- [ ] **Baseline model** — a probabilistic classifier (e.g. gradient boosting) with grouped CV, scored on Brier; must beat 0.25.
- [ ] **Calibration** — apply and validate Platt / isotonic calibration.
- [ ] **Inference & submission** — score every `environment_test.csv` row, format to `sample_submission.csv`, validate row count and id coverage.
- [ ] **(Stack)** — Streamlit dashboard for fleet risk visualization; Docling for any document-derived inputs, per project conventions.

---

*See [`Architecture.md`](../Architecture.md) for the pipeline diagram once the implementation is scaffolded.*
