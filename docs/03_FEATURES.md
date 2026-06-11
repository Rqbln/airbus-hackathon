# 03 — Features physics-informed (85) & anti-leakage

> Implémentation : `ml/src/bob_corn_ml/features.py`. Physique détaillée (anglais) : [corrosion-physics-feature-engineering.md](corrosion-physics-feature-engineering.md). Origine : notebook `04_feature_engineering.ipynb`.

## Principe

La corrosion atmosphérique exige **trois facteurs simultanés et multiplicatifs** : un électrolyte (film d'eau), des ions agressifs dissous, du temps. Le dommage est une **intégrale** :

\[ D(t) \approx \sum_{m \le t} parking_m \times f(mouillage_m) \times g(Cl_m, SO_{2,m}, T_m) \]

C'est la forme dose-réponse du standard **ISO 9223** (`rate ∝ TOWᵃ·[SO₂]ᵇ·[Cl]ᶜ·e^{f(T)}`).

## Constantes physiques

| Constante | Valeur | Source |
|---|---|---|
| `RH_THRESHOLD` | 80 % | Seuil de formation du film d'eau (ISO 9223 time-of-wetness) |
| `TOW_STEEPNESS` | 5 | Raideur de la porte logistique |
| `EA_J_PER_MOL` | 50 000 | Arrhenius : taux ×2 par +10 °C |
| `T_REF_K` | 298.15 | Référence 25 °C (facteur = 1) |
| `ROLL_WINDOWS` | 6, 12, 24 mois | Fenêtres glissantes |

## Familles de features

**Facteur 1 — électrolyte** : `tow_gate` (porte logistique sur RH, coupée si T < 0 °C : électrolyte gelé), `rh_excess`, `dew_spread` (T − T_rosée), `condensation` (≈1 quand la peau « transpire »), `freezing`, `arrhenius_rel`.

**Facteur 2 — agressivité** : `chloride` (Σ 3 bins sel marin), `acid_species` (SO₂ + sulphate + HNO₃), `oxidant` (H₂O₂ + O₃), `black_carbon` (Σ 2 bins).

**Facteur 3 — temps** : `parking_hours`.

**Doses mensuelles (produits des 3 facteurs)** : `wet_parking`, `salt_wet_dose` (la plus fidèle au mécanisme), `acid_dose`, `acid_prod_dose` (SO₂ × oxydants), `arr_wet_dose`, `corrosivity_increment` (indice ISO 9223 = CEI affiché dans le frontend).

**Intégrales causales (par avion, mois ≤ courant)** : pour chacune des 7 doses : `_cum` (somme vie entière) + `_roll6m/12m/24m` → 28 colonnes. Plus `age_months` (mois depuis le 1er relevé env — proxy d'âge identique train/test).

**Empreintes de localisation (moyenne long-terme par avion)** : `fp_coarse_seasalt` (côtier), `fp_so2` (industriel), `fp_black_carbon` (urbain), `fp_isoprene` (tropical), `fp_humidity`, `fp_temp_c`.

**+ les 33 colonnes environnementales brutes** → **85 features** au total (jeu `full`).

## Jeux de features (`select_feature_columns`)

| Jeu | Contenu | Usage |
|---|---|---|
| `full` | 85 features | Performance maximale |
| `no_age` | 83 (sans `age_months` ni `parking_hours_cum`) | Ablation : signal purement environnemental |
| `raw` | 33 colonnes brutes | Référence sans feature engineering |

## Assemblage de la matrice d'entraînement

Jointure **as-of backward** (`pd.merge_asof`) : chaque ligne de label prend les features de son **dernier mois env ≤ mois de référence**. Conserve les 246 lignes sans env au mois exact ; ~147 lignes sans aucun historique restent NaN (gérés nativement par HistGB/LightGBM).

## Règles anti-leakage (STRICTES)

1. Toute agrégation temporelle n'utilise que les mois **≤** au mois scoré (cumsum/rolling après tri par `month_start_date`).
2. Colonnes bloquées en entrée du modèle (`BLOCKED_COLUMNS`) : identifiants, target, et **flags de disponibilité** `feat_gap_months`, `exact_month`, `env_available`, `flag_prior_corrosion` — ils encodent la récence des données, corrélée au label.
3. Validation **GroupKFold par `aircraft_id`** : les deux lignes d'un avion ne sont jamais séparées train/validation.
4. `aircraft_delivery_year/month` jamais utilisés (absents côté test).

## Importance observée (run de référence)

`age_months` et `total_parking_minutes` dominent la permutation importance (logique : les paires ±24 mois diffèrent d'abord par l'âge), suivis de SO₂, `parking_hours_cum`, `wet_parking_cum`, `acid_dose_roll24m`, `salt_wet_dose_cum`. L'ablation `no_age` (Brier ≈ 0.162 vs 0.151) prouve que le signal environnemental est réel au-delà de l'âge.
