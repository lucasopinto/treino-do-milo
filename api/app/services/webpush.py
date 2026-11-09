"""Envio de Web Push com chaves VAPID."""

import json
import logging
from collections.abc import Callable
from dataclasses import dataclass

from ..config import get_settings
from ..models import PushSubscription

log = logging.getLogger(__name__)


@dataclass
class SendResult:
    ok: bool
    gone: bool  # a inscrição não existe mais (app desinstalado, permissão revogada): apagar


def _send_real(sub: PushSubscription, payload: dict) -> SendResult:
    from pywebpush import WebPushException, webpush

    settings = get_settings()
    try:
        webpush(
            subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=15 * 60,  # se o celular estiver sem sinal por mais de 15 min, o aviso não serve mais
            headers={"Urgency": "high"},
            timeout=10,
        )
        return SendResult(ok=True, gone=False)
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else None
        log.warning("push falhou (%s) para %s…", status, sub.endpoint[:40])
        return SendResult(ok=False, gone=status in (404, 410))
    except Exception:  # rede, timeout
        log.exception("push falhou para %s…", sub.endpoint[:40])
        return SendResult(ok=False, gone=False)


# Os testes trocam por um falso.
sender: Callable[[PushSubscription, dict], SendResult] = _send_real


def send(sub: PushSubscription, payload: dict) -> SendResult:
    return sender(sub, payload)
