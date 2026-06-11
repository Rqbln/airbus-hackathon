from __future__ import annotations

import argparse

from .config import ExperimentConfig
from .predict import export_submission
from .train import run_experiment


def main() -> None:
    parser = argparse.ArgumentParser(description="CorroTwin ML CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    train_p = sub.add_parser("train")
    train_p.add_argument("--model", default="histgb")
    train_p.add_argument("--calibration", default="sigmoid")
    train_p.add_argument("--feature-set", default="full")
    train_p.add_argument("--n-splits", type=int, default=5)
    train_p.add_argument("--tune", action="store_true")
    train_p.add_argument("--notes", default="")

    sub.add_parser("submission")

    args = parser.parse_args()
    if args.cmd == "train":
        cfg = ExperimentConfig(
            model_name=args.model,
            calibration=args.calibration,
            feature_set=args.feature_set,
            n_splits=args.n_splits,
            tune=args.tune,
            notes=args.notes,
        )
        result = run_experiment(cfg)
        print(f"Run {result['run_id']} — Brier OOF: {result['metrics']['brier']:.4f}")
    elif args.cmd == "submission":
        path = export_submission()
        print(f"Soumission écrite: {path}")


if __name__ == "__main__":
    main()
