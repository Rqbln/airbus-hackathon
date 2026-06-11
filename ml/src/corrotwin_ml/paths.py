"""Résolution des chemins du projet (racine, data, artefacts)."""

import os
from pathlib import Path

# ml/src/corrotwin_ml/paths.py -> racine du repo = parents[3]
_DEFAULT_ROOT = Path(__file__).resolve().parents[3]

ROOT = Path(os.environ.get("CORROTWIN_ROOT", _DEFAULT_ROOT))

DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"
ARTIFACTS = ROOT / "data" / "artifacts"
RUNS_DIR = ARTIFACTS / "runs"
SUBMISSIONS = ROOT / "data" / "submissions"
ACTIVE_RUN_FILE = ARTIFACTS / "active_run.txt"

ENV_TRAIN_CSV = DATA_RAW / "environment_training.csv"
ENV_TEST_CSV = DATA_RAW / "environment_test.csv"
CORROSIONS_CSV = DATA_RAW / "corrosions_training.csv"
SAMPLE_SUBMISSION_CSV = DATA_RAW / "sample_submission.csv"


def ensure_dirs() -> None:
    for d in (DATA_PROCESSED, RUNS_DIR, SUBMISSIONS):
        d.mkdir(parents=True, exist_ok=True)
