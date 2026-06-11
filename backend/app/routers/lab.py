from __future__ import annotations

import traceback
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

from corrotwin_ml.config import ExperimentConfig, RUNS_DIR
from corrotwin_ml.predict import export_submission
from corrotwin_ml.runs import compare_runs, get_active_run_id, list_runs, load_run, set_active_run
from corrotwin_ml.train import run_experiment

from ..schemas import CompareResponse, RunConfigRequest, RunStatusResponse

router = APIRouter()

_jobs: dict[str, str] = {}


def _run_training(run_id: str, config: ExperimentConfig) -> None:
    run_dir = RUNS_DIR / run_id
    try:
        run_experiment(config, run_dir=run_dir)
        _jobs[run_id] = "done"
    except Exception as exc:
        _jobs[run_id] = "failed"
        import json

        (run_dir / "metrics.json").write_text(
            json.dumps({"status": "failed", "error": traceback.format_exc(), "message": str(exc)}),
            encoding="utf-8",
        )


@router.post("/runs", response_model=RunStatusResponse)
def start_run(body: RunConfigRequest, background: BackgroundTasks) -> RunStatusResponse:
    config = ExperimentConfig(**body.model_dump())
    from corrotwin_ml.runs import create_run_dir

    run_dir = create_run_dir(config)
    run_id = run_dir.name
    _jobs[run_id] = "running"
    (run_dir / "metrics.json").write_text('{"status":"running"}', encoding="utf-8")
    background.add_task(_run_training, run_id, config)
    return RunStatusResponse(run_id=run_id, status="running", config=config.model_dump())


@router.get("/runs", response_model=list[RunStatusResponse])
def get_runs() -> list[RunStatusResponse]:
    out = []
    for r in list_runs():
        m = r["metrics"]
        out.append(
            RunStatusResponse(
                run_id=r["run_id"],
                status=m.get("status", "done"),
                metrics=m,
                config=r.get("config"),
                error=m.get("error"),
            )
        )
    return out


@router.get("/runs/{run_id}", response_model=RunStatusResponse)
def get_run(run_id: str) -> RunStatusResponse:
    try:
        bundle = load_run(run_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail="Run introuvable") from e
    return RunStatusResponse(
        run_id=run_id,
        status=bundle["metrics"].get("status", "done"),
        metrics=bundle["metrics"],
        config=bundle["config"],
        error=bundle["metrics"].get("error"),
    )


@router.get("/compare", response_model=CompareResponse)
def compare(run_a: str, run_b: str) -> CompareResponse:
    try:
        data = compare_runs(run_a, run_b)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return CompareResponse(**data)


@router.post("/runs/{run_id}/activate")
def activate_run(run_id: str) -> dict:
    try:
        load_run(run_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail="Run introuvable") from e
    set_active_run(run_id)
    return {"active_run_id": run_id}


@router.get("/active")
def active_run() -> dict:
    return {"active_run_id": get_active_run_id()}


@router.post("/runs/{run_id}/submission")
def generate_submission(run_id: str) -> FileResponse:
    try:
        path = export_submission(run_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return FileResponse(path=Path(path), filename=Path(path).name, media_type="text/csv")
