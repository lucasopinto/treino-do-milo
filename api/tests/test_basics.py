from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext

from app.config import Settings
from app.models import Base


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_health_db(client):
    assert client.get("/health/db").json() == {"status": "ok", "db": "ok"}


def test_docs_disponiveis(client):
    assert client.get("/docs").status_code == 200
    spec = client.get("/openapi.json").json()
    assert spec["info"]["title"] == "Treino do Milo API"


def test_cors_permite_o_app(client):
    r = client.options(
        "/health",
        headers={"Origin": "https://lucasopinto.github.io", "Access-Control-Request-Method": "GET"},
    )
    assert r.headers["access-control-allow-origin"] == "https://lucasopinto.github.io"


def test_cors_bloqueia_outros_sites(client):
    r = client.get("/health", headers={"Origin": "https://site-estranho.example"})
    assert "access-control-allow-origin" not in r.headers


def test_migracoes_batem_com_os_modelos(engine):
    """Se alguém mudar models.py e esquecer de criar a migração, este teste falha."""
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diff == []


def test_url_do_postgres_usa_psycopg():
    assert Settings(database_url="postgres://u:p@h/db").sqlalchemy_url == "postgresql+psycopg://u:p@h/db"
    assert (
        Settings(database_url="postgresql://u:p@h/db?sslmode=require").sqlalchemy_url
        == "postgresql+psycopg://u:p@h/db?sslmode=require"
    )
    assert Settings(database_url="sqlite:///x.db").sqlalchemy_url == "sqlite:///x.db"
