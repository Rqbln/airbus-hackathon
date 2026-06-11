from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import aircraft, fleet, lab, roi
from .schemas import HealthResponse

app = FastAPI(
    title="CorroTwin API",
    description="API de prédiction du risque de corrosion — HAKS 2026",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fleet.router, prefix="/api", tags=["flotte"])
app.include_router(aircraft.router, prefix="/api", tags=["aéronef"])
app.include_router(lab.router, prefix="/api/lab", tags=["labo"])
app.include_router(roi.router, prefix="/api", tags=["roi"])


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()
