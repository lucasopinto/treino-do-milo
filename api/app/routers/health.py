from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_session
from ..version import VERSION

router = APIRouter(tags=["saúde"])


@router.get("/health", summary="A API está no ar? (não consulta o banco, para ele poder dormir)")
def health() -> dict:
    return {"status": "ok", "version": VERSION, "push": get_settings().push_enabled}


@router.get("/health/db", summary="A API e o banco estão no ar?")
def health_db(session: Session = Depends(get_session)) -> dict:
    session.execute(text("SELECT 1"))
    return {"status": "ok", "db": "ok"}
