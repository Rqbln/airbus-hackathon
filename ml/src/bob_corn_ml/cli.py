"""CLI du pipeline : python -m bob_corn_ml.cli <commande>."""

import argparse
import json

from . import runs
from .config import ExperimentConfig
from .predict import make_submission
from .train import run_experiment
from .tuning import random_search


def main() -> None:
    parser = argparse.ArgumentParser(prog="bob_corn_ml", description="Pipeline ML Bob-corn")
    sub = parser.add_subparsers(dest="command", required=True)

    p_train = sub.add_parser("train", help="Entraîne un modèle (run persisté)")
    p_train.add_argument("--model", default="histgb",
                         choices=["lightgbm", "histgb", "logreg", "constant", "ensemble"])
    p_train.add_argument("--calibration", default="sigmoid",
                         choices=["none", "sigmoid", "isotonic"])
    p_train.add_argument("--feature-set", default="full", choices=["full", "no_age", "raw"])
    p_train.add_argument("--folds", type=int, default=5)
    p_train.add_argument("--seed", type=int, default=42)
    p_train.add_argument("--name", default="")
    p_train.add_argument("--params", default="{}", help="JSON d'hyperparamètres")

    p_sub = sub.add_parser("submission", help="Génère la soumission Kaggle")
    p_sub.add_argument("--run", default=None, help="run_id (défaut : run actif)")

    sub.add_parser("list", help="Liste les runs")

    p_tune = sub.add_parser("tune", help="Recherche aléatoire d'hyperparamètres")
    p_tune.add_argument("--model", default="lightgbm", choices=["lightgbm", "histgb"])
    p_tune.add_argument("--n-iter", type=int, default=15)
    p_tune.add_argument("--calibration", default="sigmoid")
    p_tune.add_argument("--feature-set", default="full")

    args = parser.parse_args()

    if args.command == "train":
        config = ExperimentConfig(
            name=args.name,
            model=args.model,
            model_params=json.loads(args.params),
            feature_set=args.feature_set,
            calibration=args.calibration,
            n_splits=args.folds,
            seed=args.seed,
        )
        run_id = run_experiment(config)
        run = runs.get_run(run_id)
        m = run["metrics"]
        print(f"run      : {run_id}")
        print(f"brier    : {m['brier']:.4f}  (non calibré : {m['brier_uncalibrated']:.4f})")
        print(f"auc      : {m['auc']:.4f}")
        print(f"ece      : {m['ece']:.4f}")
        print(f"baseline : 0.2500 (constante 0.5)")

    elif args.command == "submission":
        run_id = args.run or runs.get_active()
        if run_id is None:
            raise SystemExit("Aucun run actif — entraîner un modèle d'abord (make train)")
        path = make_submission(run_id)
        print(f"soumission : {path}")

    elif args.command == "list":
        for r in runs.list_runs():
            s = r["summary"]
            star = "*" if r["is_active"] else " "
            brier = f"{s['brier']:.4f}" if s["brier"] is not None else "  -   "
            print(f"{star} {r['run_id']}  [{r['status']}]  brier={brier}")

    elif args.command == "tune":
        run_ids = random_search(
            model=args.model,
            n_iter=args.n_iter,
            feature_set=args.feature_set,
            calibration=args.calibration,
        )
        best = runs.best_run_id()
        print(f"{len(run_ids)} runs de tuning terminés — meilleur run global : {best}")


if __name__ == "__main__":
    main()
