"""API Bob-corn — FastAPI sur le port 8000 (jamais 5000 sur macOS)."""

from bob_corn_ml import paths, runs
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import aircraft, fleet, lab, roi

app = FastAPI(
    title="Bob-corn API",
    description="Prédiction du risque de corrosion des voilures — HAKS 2026",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fleet.router)
app.include_router(aircraft.router)
app.include_router(lab.router)
app.include_router(roi.router)

paths.ensure_dirs()


@app.get("/health", tags=["sante"])
def health() -> dict:
    return {"status": "operational", "version": "1.0.0", "active_run": runs.get_active()}


@app.get("/api/metrics", tags=["metriques"])
def metrics() -> dict:
    """Métriques du run actif (celui qui alimente le dashboard)."""
    run_id = runs.get_active()
    if run_id is None:
        return {"active_run": None, "metrics": None}
    run = runs.get_run(run_id)
    return {"active_run": run_id, "config": run["config"], "metrics": run["metrics"]}
