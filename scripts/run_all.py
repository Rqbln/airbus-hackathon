"""Run the full pipeline end-to-end: explore -> baseline -> FE -> ensemble -> dashboard data."""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent

steps = [
    "01_explore.py",
    "02_train_baseline.py",
    "03_train_feature_engineering.py",
    "04_train_ensemble.py",
    "05_generate_dashboard_data.py",
]

for s in steps:
    print(f"\n{'=' * 70}\n>>> {s}\n{'=' * 70}")
    rc = subprocess.call([sys.executable, str(HERE / s)])
    if rc != 0:
        print(f"!!! step {s} failed (rc={rc})")
        sys.exit(rc)
print("\nAll done.")
