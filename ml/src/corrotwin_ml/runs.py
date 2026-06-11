from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib

from .config import ACTIVE_RUN_FILE, RUNS_DIR, ExperimentConfig


def _now_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def create_run_dir(config: ExperimentConfig) -> Path:
    run_id = f"{_now_id()}_{config.slug()}"
    path = RUNS_DIR / run_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_run(
    run_dir: Path,
    config: ExperimentConfig,
    metrics: dict[str, Any],
    model: Any,
    feature_names: list[str],
    oof_df: Any | None = None,
    status: str = "done",
    error: str | None = None,
) -> str:
    run_id = run_dir.name
    config_path = run_dir / "config.json"
    metrics_path = run_dir / "metrics.json"
    model_path = run_dir / "model.joblib"
    features_path = run_dir / "features.json"

    payload_metrics = {
        "run_id": run_id,
        "status": status,
        "error": error,
        **metrics,
    }

    config_path.write_text(config.model_dump_json(indent=2), encoding="utf-8")
    metrics_path.write_text(json.dumps(payload_metrics, indent=2), encoding="utf-8")
    features_path.write_text(json.dumps(feature_names, indent=2), encoding="utf-8")
    joblib.dump(model, model_path)

    if oof_df is not None:
        oof_df.to_csv(run_dir / "oof.csv", index=False)

    return run_id


def list_runs() -> list[dict]:
    if not RUNS_DIR.exists():
        return []
    runs = []
    for d in sorted(RUNS_DIR.iterdir(), reverse=True):
        if not d.is_dir():
            continue
        metrics_file = d / "metrics.json"
        config_file = d / "config.json"
        if not metrics_file.exists():
            continue
        metrics = json.loads(metrics_file.read_text(encoding="utf-8"))
        config = json.loads(config_file.read_text(encoding="utf-8")) if config_file.exists() else {}
        runs.append({"run_id": d.name, "metrics": metrics, "config": config})
    return runs


def load_run(run_id: str) -> dict:
    run_dir = RUNS_DIR / run_id
    if not run_dir.exists():
        raise FileNotFoundError(run_id)
    metrics = json.loads((run_dir / "metrics.json").read_text(encoding="utf-8"))
    config = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    features = json.loads((run_dir / "features.json").read_text(encoding="utf-8"))
    model = joblib.load(run_dir / "model.joblib")
    oof_path = run_dir / "oof.csv"
    oof = oof_path.read_text(encoding="utf-8") if oof_path.exists() else None
    return {
        "run_id": run_id,
        "run_dir": str(run_dir),
        "metrics": metrics,
        "config": config,
        "features": features,
        "model": model,
        "oof_csv": oof,
    }


def get_active_run_id() -> str | None:
    if ACTIVE_RUN_FILE.exists():
        rid = ACTIVE_RUN_FILE.read_text(encoding="utf-8").strip()
        return rid or None
    runs = list_runs()
    if not runs:
        return None
    best = min(
        (r for r in runs if r["metrics"].get("status") == "done"),
        key=lambda r: r["metrics"].get("brier", 1.0),
        default=None,
    )
    return best["run_id"] if best else None


def set_active_run(run_id: str) -> None:
    ACTIVE_RUN_FILE.parent.mkdir(parents=True, exist_ok=True)
    ACTIVE_RUN_FILE.write_text(run_id, encoding="utf-8")


def compare_runs(run_id_a: str, run_id_b: str) -> dict:
    a = load_run(run_id_a)
    b = load_run(run_id_b)
    ma, mb = a["metrics"], b["metrics"]
    ca, cb = a["config"], b["config"]
    metric_keys = ["brier", "log_loss", "roc_auc", "ece", "delta_vs_baseline_025"]
    diff_metrics = {k: {"a": ma.get(k), "b": mb.get(k), "delta": None} for k in metric_keys}
    for k in metric_keys:
        if ma.get(k) is not None and mb.get(k) is not None:
            diff_metrics[k]["delta"] = float(mb[k]) - float(ma[k])
    config_diff = {k: {"a": ca.get(k), "b": cb.get(k)} for k in set(ca) | set(cb) if ca.get(k) != cb.get(k)}
    return {"run_a": run_id_a, "run_b": run_id_b, "metrics": diff_metrics, "config_diff": config_diff}
