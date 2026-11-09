import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",  # segundo "celular" nos testes locais (outro endereço = outros dados)
    "https://lucasopinto.github.io",
]


class Settings(BaseSettings):
    """Configuração lida de variáveis de ambiente (ou de um arquivo .env na pasta api/)."""

    # Os testes desligam o .env (MILO_ENV_FILE vazio) para não depender da configuração local.
    model_config = SettingsConfigDict(env_file=os.environ.get("MILO_ENV_FILE", ".env") or None, env_prefix="MILO_", extra="ignore")

    # Local: SQLite. Produção: a URL do PostgreSQL (ex.: a do Neon).
    database_url: str = "sqlite:///./milo.db"
    # Origens que podem chamar a API (o app no GitHub Pages e o servidor de desenvolvimento).
    cors_origins: list[str] = DEFAULT_ORIGINS
    # Fuso usado para saber quando é hora de cada saída de xixi.
    timezone: str = "America/Sao_Paulo"
    # Segredo que o cron externo manda no cabeçalho X-Cron-Secret. Vazio = /cron/tick desligado.
    cron_secret: str = ""
    # Chaves VAPID para Web Push (gere com: python -m app.tools.vapid). Vazio = push desligado.
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:treino-do-milo@example.com"
    # Convites valem por este tempo.
    invite_ttl_hours: int = 24

    @property
    def sqlalchemy_url(self) -> str:
        """Aceita a URL no formato que o Neon/Render mostram e escolhe o driver psycopg 3."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://") :]
        return url

    @property
    def push_enabled(self) -> bool:
        return bool(self.vapid_public_key and self.vapid_private_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
