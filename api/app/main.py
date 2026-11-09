from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import health, households, sync
from .version import VERSION

DESCRIPTION = """
API do **Treino do Milo**: guarda os dados da casa e sincroniza os celulares.

* **Casa**: crie uma casa no primeiro celular e entre nela pelos outros com o código de convite.
* **Sync**: cada aparelho envia o que mudou e recebe o que mudou nos outros ("o mais recente vence").
* **Push**: lembretes de saída de xixi chegam mesmo com o app fechado.

Autenticação: `Authorization: Bearer <token>` (o token é entregue ao criar ou entrar numa casa).
"""


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Treino do Milo API", version=VERSION, description=DESCRIPTION)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=86400,
    )
    app.include_router(health.router)
    app.include_router(households.router)
    app.include_router(sync.router)
    return app


app = create_app()
