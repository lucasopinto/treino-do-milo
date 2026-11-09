import hashlib
import secrets
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_session
from .models import Device
from .util import now_ms

# Sem letras e números que se confundem (O/0, I/1/L).
INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
INVITE_LENGTH = 6


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_invite_code() -> str:
    return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(INVITE_LENGTH))


def normalize_code(code: str) -> str:
    return code.strip().upper().replace(" ", "").replace("-", "")


bearer = HTTPBearer(auto_error=False, description="Token do aparelho")


def current_device(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: Session = Depends(get_session),
) -> Device:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faltou o token do aparelho.")
    device = session.scalar(select(Device).where(Device.token_hash == hash_token(creds.credentials)))
    if device is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Este aparelho não faz mais parte da casa.")
    now = now_ms()
    if now - device.last_seen_at > 60_000:
        device.last_seen_at = now
        session.commit()
    return device


class RateLimiter:
    """Limite simples em memória (um servidor só). Protege a entrada por código de convite."""

    def __init__(self, max_hits: int, window_s: float) -> None:
        self.max_hits = max_hits
        self.window_s = window_s
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > self.window_s:
            q.popleft()
        if len(q) >= self.max_hits:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Muitas tentativas. Espere alguns minutos.")
        q.append(now)

    def reset(self) -> None:
        self.hits.clear()


join_limiter = RateLimiter(max_hits=10, window_s=600)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "?"
