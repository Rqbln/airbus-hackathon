from __future__ import annotations

from fastapi import APIRouter, HTTPException

from corrotwin_ml.predict import aircraft_timeline

from ..schemas import TimelinePoint

router = APIRouter()


@router.get("/aircraft/{aircraft_id}", response_model=list[TimelinePoint])
def get_aircraft(aircraft_id: str) -> list[TimelinePoint]:
    try:
        rows = aircraft_timeline(aircraft_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    if not rows:
        raise HTTPException(status_code=404, detail="Aéronef introuvable")
    return [TimelinePoint(**r) for r in rows]
