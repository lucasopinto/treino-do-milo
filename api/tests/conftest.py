"""Fixtures dos testes.

Por padrão os testes usam um SQLite temporário. No CI, MILO_TEST_DATABASE_URL aponta para
um PostgreSQL de verdade, e os mesmos testes rodam nele.
O banco é criado pelas migrações do Alembic (assim elas também são testadas).
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.db import get_session, make_engine
from app.main import create_app
from app.models import Base

API_DIR = Path(__file__).resolve().parent.parent


def run_migrations(engine: Engine) -> None:
    cfg = Config(str(API_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(API_DIR / "alembic"))
    with engine.begin() as conn:
        cfg.attributes["connection"] = conn
        command.upgrade(cfg, "head")


@pytest.fixture(scope="session")
def engine(tmp_path_factory: pytest.TempPathFactory) -> Iterator[Engine]:
    url = os.environ.get("MILO_TEST_DATABASE_URL")
    if url:
        url = Settings(database_url=url).sqlalchemy_url
        eng = make_engine(url)
        with eng.begin() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
    else:
        eng = make_engine(f"sqlite:///{tmp_path_factory.mktemp('db') / 'test.db'}")
    run_migrations(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    """Sessão com o banco limpo no começo de cada teste."""
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    maker = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with maker() as session:
        yield session


@pytest.fixture
def client(engine: Engine, db: Session) -> Iterator[TestClient]:
    maker = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def _session() -> Iterator[Session]:
        with maker() as s:
            yield s

    app = create_app()
    app.dependency_overrides[get_session] = _session
    with TestClient(app) as c:
        yield c
