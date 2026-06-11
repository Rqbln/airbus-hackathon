"""Phase 1 - Exploration rapide des donnees (version refactorisee).
Reprend la logique du script racine 01_explore.py en utilisant le package corrosion.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import pandas as pd
from corrosion import data, target


def main():
    corr = data.load_corrosions()
    env_train = data.load_environment("train")
    env_test = data.load_environment("test")
    sample = data.load_sample_submission()

    print("=== Shapes ===")
    print(f"corrosions_training  : {corr.shape}")
    print(f"environment_training : {env_train.shape}")
    print(f"environment_test     : {env_test.shape}")
    print(f"sample_submission    : {sample.shape}")

    print("\n=== Avions ===")
    print(f"Avions train (env)   : {env_train['aircraft_id'].nunique()}")
    print(f"Avions train (corr)  : {corr['aircraft_id'].nunique()}")
    print(f"Avions test (env)    : {env_test['aircraft_id'].nunique()}")

    pairs = target.build_training_pairs(corr)
    merged = pairs.merge(env_train, on=['aircraft_id', 'year_month'], how='inner')
    complete = target.keep_complete_pairs(merged)
    print(f"\n=== Cible (Airbus convention) ===")
    print(f"Paires totales attendues : {len(pairs)}")
    print(f"Paires apres jointure    : {len(merged)}")
    print(f"Avions avec 1 ET 0       : {complete['aircraft_id'].nunique()}")
    print(f"Lignes train finales     : {len(complete)}")


if __name__ == "__main__":
    main()
