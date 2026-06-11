"""Recherche aléatoire d'hyperparamètres (légère, CPU, reproductible).

Chaque configuration testée est un run complet persisté : le Labo ML les
compare comme n'importe quel autre benchmark.
"""

import random
from typing import Any

from .config import ExperimentConfig
from .train import run_experiment

SEARCH_SPACE: dict[str, dict[str, list[Any]]] = {
    "histgb": {
        "max_iter": [150, 300, 500],
        "learning_rate": [0.03, 0.05, 0.1],
        "max_leaf_nodes": [15, 31, 63],
        "l2_regularization": [0.0, 1.0, 5.0],
        "min_samples_leaf": [10, 20, 40],
    },
    "lightgbm": {
        "n_estimators": [200, 400, 800],
        "learning_rate": [0.03, 0.05, 0.1],
        "num_leaves": [15, 31, 63],
        "min_child_samples": [10, 20, 40],
        "reg_lambda": [0.0, 1.0, 5.0],
        "subsample": [0.7, 0.9, 1.0],
        "colsample_bytree": [0.7, 0.9, 1.0],
    },
}


def random_search(
    model: str = "lightgbm",
    n_iter: int = 15,
    feature_set: str = "full",
    calibration: str = "sigmoid",
    n_splits: int = 5,
    seed: int = 42,
) -> list[str]:
    """Lance n_iter runs avec des hyperparamètres tirés au hasard. Retourne les run_ids."""
    if model not in SEARCH_SPACE:
        raise ValueError(f"Pas d'espace de recherche pour : {model}")
    rng = random.Random(seed)
    space = SEARCH_SPACE[model]
    seen: set[tuple] = set()
    run_ids = []
    attempts = 0
    while len(run_ids) < n_iter and attempts < n_iter * 10:
        attempts += 1
        params = {k: rng.choice(v) for k, v in space.items()}
        key = tuple(sorted(params.items()))
        if key in seen:
            continue
        seen.add(key)
        config = ExperimentConfig(
            name=f"tuning {model} #{len(run_ids) + 1}",
            model=model,
            model_params=params,
            feature_set=feature_set,
            calibration=calibration,
            n_splits=n_splits,
            seed=seed,
            notes="random search",
        )
        run_ids.append(run_experiment(config))
    return run_ids
