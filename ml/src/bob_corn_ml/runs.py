"""Persistance des runs : chaque entraînement écrit un dossier autonome.

data/artifacts/runs/<run_id>/
├── config.json    — ExperimentConfig sérialisée
├── status.json    — pending | running | done | failed (+ erreur éventuelle)
├── metrics.json   — toutes les métriques OOF (voir metrics.py)
├── model.joblib   — modèle final + calibrateur + liste de features
├── oof.csv        — prédictions out-of-fold (audit)
└── test_predictions.csv — risque prédit pour chaque ligne de la flotte test
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

from . import paths
from .config import ExperimentConfig


def new_run_id(config: ExperimentConfig) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{ts}_{config.slug()}"


def run_dir(run_id: str) -> Path:
    return paths.RUNS_DIR / run_id


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text()) if path.exists() else None


def init_run(config: ExperimentConfig) -> str:
    run_id = new_run_id(config)
    d = run_dir(run_id)
    d.mkdir(parents=True, exist_ok=True)
    _write_json(d / "config.json", config.model_dump())
    set_status(run_id, "pending")
    return run_id


def set_status(run_id: str, status: str, error: str | None = None) -> None:
    payload = {"status": status, "updated_at": datetime.now().isoformat()}
    if error:
        payload["error"] = error
    _write_json(run_dir(run_id) / "status.json", payload)


def save_metrics(run_id: str, metrics: dict) -> None:
    _write_json(run_dir(run_id) / "metrics.json", metrics)


def get_run(run_id: str) -> dict | None:
    d = run_dir(run_id)
    if not d.exists():
        return None
    return {
        "run_id": run_id,
        "config": _read_json(d / "config.json"),
        "status": (_read_json(d / "status.json") or {}).get("status", "unknown"),
        "error": (_read_json(d / "status.json") or {}).get("error"),
        "metrics": _read_json(d / "metrics.json"),
    }


def list_runs() -> list[dict]:
    """Résumé de tous les runs, du plus récent au plus ancien."""
    if not paths.RUNS_DIR.exists():
        return []
    out = []
    active = get_active()
    for d in sorted(paths.RUNS_DIR.iterdir(), reverse=True):
        if not d.is_dir():
            continue
        run = get_run(d.name)
        if run is None:
            continue
        m = run.get("metrics") or {}
        out.append(
            {
                "run_id": run["run_id"],
                "status": run["status"],
                "error": run.get("error"),
                "config": run["config"],
                "is_active": run["run_id"] == active,
                "summary": {
                    "brier": m.get("brier"),
                    "brier_uncalibrated": m.get("brier_uncalibrated"),
                    "log_loss": m.get("log_loss"),
                    "auc": m.get("auc"),
                    "ece": m.get("ece"),
                    "brier_per_fold_mean": m.get("brier_per_fold_mean"),
                    "brier_per_fold_std": m.get("brier_per_fold_std"),
                    "n_features": m.get("n_features"),
                    "duration_seconds": m.get("duration_seconds"),
                    "delta_vs_baseline": (
                        m["brier"] - 0.25 if m.get("brier") is not None else None
                    ),
                },
            }
        )
    return out


def delete_run(run_id: str) -> bool:
    d = run_dir(run_id)
    if not d.exists():
        return False
    if get_active() == run_id:
        paths.ACTIVE_RUN_FILE.unlink(missing_ok=True)
    shutil.rmtree(d)
    return True


def set_active(run_id: str) -> None:
    if not run_dir(run_id).exists():
        raise ValueError(f"Run introuvable : {run_id}")
    paths.ACTIVE_RUN_FILE.parent.mkdir(parents=True, exist_ok=True)
    paths.ACTIVE_RUN_FILE.write_text(run_id)


def get_active() -> str | None:
    if paths.ACTIVE_RUN_FILE.exists():
        run_id = paths.ACTIVE_RUN_FILE.read_text().strip()
        if run_dir(run_id).exists():
            return run_id
    return None


def best_run_id() -> str | None:
    """Run terminé avec le meilleur Brier OOF."""
    candidates = [
        r
        for r in list_runs()
        if r["status"] == "done" and r["summary"]["brier"] is not None
    ]
    if not candidates:
        return None
    return min(candidates, key=lambda r: r["summary"]["brier"])["run_id"]


def maybe_activate(run_id: str) -> bool:
    """Active le run s'il est meilleur (Brier) que l'actif courant."""
    current = get_active()
    if current is None:
        set_active(run_id)
        return True
    new = get_run(run_id)
    cur = get_run(current)
    new_brier = (new.get("metrics") or {}).get("brier")
    cur_brier = (cur.get("metrics") or {}).get("brier") if cur else None
    if new_brier is not None and (cur_brier is None or new_brier < cur_brier):
        set_active(run_id)
        return True
    return False
