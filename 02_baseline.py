"""
Phase 2 - Pipeline baseline LightGBM
Strategie:
  - Pour chaque avion train avec les 2 mois disponibles: 1 ligne "1" + 1 ligne "0"
  - Features = uniquement les 33 variables du mois cible
  - Modele: LightGBM en classification binaire avec probas
  - Validation: GroupKFold sur aircraft_id (pour eviter le leak entre les 2 lignes d'un meme avion)
  - Calibration: sigmoide
  - Submission: prediction sur les 14 303 lignes de environment_test
"""
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import GroupKFold
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import brier_score_loss
import lightgbm as lgb

DATA_DIR = Path(r"C:\Users\louay\Desktop\Hackathon-IBM-Airbus")
RANDOM_STATE = 42

# -----------------------------------------------------------------------------
# 1. CHARGEMENT
# -----------------------------------------------------------------------------
print("[1/6] Chargement...")
corr = pd.read_csv(DATA_DIR / "corrosions_training.csv", parse_dates=["observation_date"])
env_train = pd.read_csv(DATA_DIR / "environment_training.csv")
env_test = pd.read_csv(DATA_DIR / "environment_test.csv")
submission = pd.read_csv(DATA_DIR / "sample_submission-3.csv")

ID_COLS = ['aircraft_id', 'year_month', 'month_start_date']
FEATURE_COLS = [c for c in env_train.columns if c not in ID_COLS]
print(f"  Features: {len(FEATURE_COLS)}")

# -----------------------------------------------------------------------------
# 2. CONSTRUCTION DU TARGET (1 / 0)
# -----------------------------------------------------------------------------
print("[2/6] Construction du training set...")
corr['obs_ym'] = corr['observation_date'].dt.strftime('%Y-%m')
corr['m24_ym'] = (corr['observation_date'] - pd.DateOffset(months=24)).dt.strftime('%Y-%m')

# Lignes "1": mois d'observation
rows_pos = corr[['aircraft_id', 'obs_ym']].rename(columns={'obs_ym': 'year_month'})
rows_pos['target'] = 1
# Lignes "0": mois - 24
rows_neg = corr[['aircraft_id', 'm24_ym']].rename(columns={'m24_ym': 'year_month'})
rows_neg['target'] = 0

train_pairs = pd.concat([rows_pos, rows_neg], ignore_index=True)
print(f"  Paires (avion, mois) candidates: {len(train_pairs)} (= 2 x {len(corr)})")

# Jointure avec environment_training pour recuperer les features
train_df = train_pairs.merge(env_train, on=['aircraft_id', 'year_month'], how='inner')
print(f"  Apres jointure (lignes valides): {len(train_df)}")
print(f"  Avions uniques: {train_df['aircraft_id'].nunique()}")

# On garde seulement les avions qui ont LES DEUX (1 et 0) pour eviter le desequilibre
counts = train_df.groupby('aircraft_id')['target'].nunique()
both = counts[counts == 2].index
train_df = train_df[train_df['aircraft_id'].isin(both)].reset_index(drop=True)
print(f"  Avions avec 1 et 0 disponibles: {len(both)}")
print(f"  Training set final: {len(train_df)} lignes")
print(f"  Equilibre classes: {train_df['target'].value_counts().to_dict()}")

# -----------------------------------------------------------------------------
# 3. PREPARATION X, y, groupes
# -----------------------------------------------------------------------------
X = train_df[FEATURE_COLS].copy()
y = train_df['target'].values
groups = train_df['aircraft_id'].values

# -----------------------------------------------------------------------------
# 4. CROSS-VALIDATION GroupKFold
# -----------------------------------------------------------------------------
print("[3/6] Cross-validation GroupKFold (5 folds, group = aircraft_id)...")
N_SPLITS = 5
gkf = GroupKFold(n_splits=N_SPLITS)

oof_preds = np.zeros(len(X))
brier_scores = []

lgb_params = dict(
    n_estimators=2000,
    learning_rate=0.03,
    num_leaves=31,
    max_depth=-1,
    min_child_samples=10,
    subsample=0.85,
    subsample_freq=1,
    colsample_bytree=0.85,
    reg_alpha=0.1,
    reg_lambda=0.1,
    random_state=RANDOM_STATE,
    verbose=-1,
    n_jobs=-1,
)

for fold, (tr_idx, va_idx) in enumerate(gkf.split(X, y, groups), 1):
    X_tr, X_va = X.iloc[tr_idx], X.iloc[va_idx]
    y_tr, y_va = y[tr_idx], y[va_idx]

    model = lgb.LGBMClassifier(**lgb_params)
    model.fit(
        X_tr, y_tr,
        eval_set=[(X_va, y_va)],
        eval_metric='binary_logloss',
        callbacks=[lgb.early_stopping(100, verbose=False)],
    )
    preds = model.predict_proba(X_va)[:, 1]
    oof_preds[va_idx] = preds
    score = brier_score_loss(y_va, preds)
    brier_scores.append(score)
    print(f"  Fold {fold}: Brier = {score:.4f} (best_iter={model.best_iteration_})")

print(f"\n  Brier OOF moyen: {np.mean(brier_scores):.4f} (+/- {np.std(brier_scores):.4f})")
print(f"  Brier OOF global: {brier_score_loss(y, oof_preds):.4f}")
print(f"  Baseline a battre (0.5 constant): 0.25")

# -----------------------------------------------------------------------------
# 5. ENTRAINEMENT FINAL + CALIBRATION
# -----------------------------------------------------------------------------
print("[4/6] Entrainement final + calibration sigmoide...")
# Pour la calibration on utilise un classifier non calibre puis on calibre via CV
base_model = lgb.LGBMClassifier(**{**lgb_params, 'n_estimators': 500})  # n_estimators fixe pour calib
calibrated = CalibratedClassifierCV(base_model, method='sigmoid', cv=5)
calibrated.fit(X, y)
print("  OK")

# -----------------------------------------------------------------------------
# 6. PREDICTION SUR LE TEST + SUBMISSION
# -----------------------------------------------------------------------------
print("[5/6] Prediction sur environment_test...")
X_test = env_test[FEATURE_COLS].copy()
test_preds = calibrated.predict_proba(X_test)[:, 1]
env_test['pred'] = test_preds
env_test['id'] = env_test['aircraft_id'] + '_' + env_test['year_month']

print("[6/6] Generation du fichier de submission...")
sub_out = submission[['id']].merge(env_test[['id', 'pred']], on='id', how='left')
assert sub_out['pred'].isna().sum() == 0, "Predictions manquantes!"
sub_out = sub_out.rename(columns={'pred': 'corrosion_risk'})
out_path = DATA_DIR / "submission_baseline.csv"
sub_out.to_csv(out_path, index=False)
print(f"  Submission ecrite: {out_path}")
print(f"  Stats predictions: min={sub_out['corrosion_risk'].min():.3f}, "
      f"mean={sub_out['corrosion_risk'].mean():.3f}, "
      f"max={sub_out['corrosion_risk'].max():.3f}")

# Importance des features (signal pour la phase 3)
print("\n[BONUS] Top 15 features les plus importantes (modele non-calibre sur tout le train):")
final_model = lgb.LGBMClassifier(**lgb_params).fit(X, y)
imp = pd.DataFrame({
    'feature': FEATURE_COLS,
    'gain': final_model.booster_.feature_importance(importance_type='gain'),
}).sort_values('gain', ascending=False)
print(imp.head(15).to_string(index=False))
