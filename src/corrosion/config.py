"""Constantes et chemins du projet."""
from pathlib import Path

# Racine projet (3 niveaux au-dessus de ce fichier)
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Donnees brutes a la racine (legacy hackathon kaggle download)
DATA_DIR = PROJECT_ROOT
RAW_TRAIN_CORR = DATA_DIR / "corrosions_training.csv"
RAW_TRAIN_ENV = DATA_DIR / "environment_training.csv"
RAW_TEST_ENV = DATA_DIR / "environment_test.csv"
RAW_SAMPLE_SUB = DATA_DIR / "sample_submission-3.csv"

# Sorties
SUBMISSIONS_DIR = PROJECT_ROOT / "submissions"
REPORTS_DIR = PROJECT_ROOT / "reports"
MODELS_DIR = PROJECT_ROOT / "models"

for d in (SUBMISSIONS_DIR, REPORTS_DIR, MODELS_DIR):
    d.mkdir(exist_ok=True, parents=True)

# Colonnes
ID_COLS = ['aircraft_id', 'year_month', 'month_start_date']
TARGET_COL = 'corrosion_risk'

RANDOM_STATE = 42
N_FOLDS = 5

# Variables environnementales (33 features brutes)
RAW_FEATURE_COLS = [
    'total_parking_minutes',
    'metar_temperature_c', 'metar_relative_humidity', 'metar_dew_point_c',
    'metar_wind_speed_kn', 'metar_visibility_mi', 'metar_hour_precipitation',
    'sea_salt_aerosol_003_05_mixing_ratio',
    'sea_salt_aerosol_05_5_mixing_ratio',
    'sea_salt_aerosol_5_20_mixing_ratio',
    'dust_aerosol_003_055_mixing_ratio',
    'dust_aerosol_055_09_mixing_ratio',
    'dust_aerosol_09_20_mixing_ratio',
    'hydrophilic_organic_matter_aerosol_mixing_ratio',
    'hydrophobic_organic_matter_aerosol_mixing_ratio',
    'hydrophilic_black_carbon_aerosol_mixing_ratio',
    'hydrophobic_black_carbon_aerosol_mixing_ratio',
    'sulphate_aerosol_mixing_ratio',
    'ethane', 'c3h8', 'isoprene',
    'carbon_monoxide_mass_mixing_ratio',
    'ozone_mass_mixing_ratio',
    'h2o2', 'formaldehyde', 'hno3',
    'nitrogen_monoxide_mass_mixing_ratio',
    'nitrogen_dioxide_mass_mixing_ratio',
    'oh', 'organic_nitrates', 'specific_humidity',
    'sulphur_dioxide_mass_mixing_ratio',
    'temperature',
]

# Variables cles utilisees pour les rolling/cumulatives (les plus impactantes)
KEY_VARS = [
    'total_parking_minutes',
    'metar_relative_humidity',
    'metar_temperature_c',
    'sea_salt_aerosol_05_5_mixing_ratio',
    'sea_salt_aerosol_003_05_mixing_ratio',
    'sulphur_dioxide_mass_mixing_ratio',
    'ozone_mass_mixing_ratio',
    'nitrogen_dioxide_mass_mixing_ratio',
    'hno3',
    'sulphate_aerosol_mixing_ratio',
    'hydrophilic_black_carbon_aerosol_mixing_ratio',
    'specific_humidity',
]

ROLLING_WINDOWS = [3, 6, 12, 24]
