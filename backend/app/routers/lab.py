"""Labo ML : lancement de benchmarks, suivi des runs, comparaison, soumission."""

import threading

from bob_corn_ml import runs
from bob_corn_ml.config import ExperimentConfig
from bob_corn_ml.models import available_models
from bob_corn_ml.predict import make_submission
from bob_corn_ml.train import run_experiment
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

from .. import services
from ..schemas import RunCreatedResponse, RunRequest

router = APIRouter(prefix="/api/lab", tags=["labo"])

# Les entraînements s'exécutent un à la fois (CPU local)
_train_lock = threading.Lock()


def _train_task(config: ExperimentConfig, run_id: str) -> None:
    with _train_lock:
        try:
            run_experiment(config, run_id=run_id)
        except Exception:
            # L'erreur est déjà persistée dans status.json par run_experiment
            pass
    services._predictions_cached.cache_clear()


@router.get("/options")
def options() -> dict:
    return {
        "models": available_models(),
        "feature_sets": [
            {"id": "full", "label": "Complet (85 features physics-informed)"},
            {"id": "no_age", "label": "Sans âge (ablation — signal environnemental pur)"},
            {"id": "raw", "label": "Colonnes brutes uniquement (33)"},
        ],
        "calibrations": [
            {"id": "sigmoid", "label": "Platt (sigmoïde) — recommandé"},
            {"id": "isotonic", "label": "Isotonique"},
            {"id": "none", "label": "Aucune"},
        ],
        "defaults": ExperimentConfig().model_dump(),
    }


@router.post("/runs", response_model=RunCreatedResponse)
def create_run(req: RunRequest, background: BackgroundTasks) -> RunCreatedResponse:
    config = ExperimentConfig(**req.model_dump())
    run_id = runs.init_run(config)
    background.add_task(_train_task, config, run_id)
    return RunCreatedResponse(run_id=run_id, status="pending")


@router.get("/runs")
def list_all_runs() -> dict:
    return {"active_run": runs.get_active(), "runs": runs.list_runs()}


@router.get("/runs/{run_id}")
def run_detail(run_id: str) -> dict:
    run = runs.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run introuvable : {run_id}")
    run["is_active"] = runs.get_active() == run_id
    return run


@router.post("/runs/{run_id}/activate")
def activate_run(run_id: str) -> dict:
    run = runs.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run introuvable : {run_id}")
    if run["status"] != "done":
        raise HTTPException(status_code=409, detail="Le run n'est pas terminé")
    runs.set_active(run_id)
    services._predictions_cached.cache_clear()
    return {"active_run": run_id}


@router.delete("/runs/{run_id}")
def remove_run(run_id: str) -> dict:
    if not runs.delete_run(run_id):
        raise HTTPException(status_code=404, detail=f"Run introuvable : {run_id}")
    return {"deleted": run_id}


@router.get("/compare")
def compare(a: str, b: str) -> dict:
    run_a, run_b = runs.get_run(a), runs.get_run(b)
    if run_a is None or run_b is None:
        raise HTTPException(status_code=404, detail="Un des deux runs est introuvable")
    return {"a": run_a, "b": run_b}


@router.post("/runs/{run_id}/submission")
def generate_submission(run_id: str) -> FileResponse:
    run = runs.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run introuvable : {run_id}")
    if run["status"] != "done":
        raise HTTPException(status_code=409, detail="Le run n'est pas terminé")
    try:
        path = make_submission(run_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return FileResponse(path, media_type="text/csv", filename=path.name)
