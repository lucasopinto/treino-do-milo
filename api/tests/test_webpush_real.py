"""Envio real (pywebpush + VAPID) para um "serviço de push" local.

Confere que a mensagem sai criptografada do jeito que o navegador espera (aes128gcm),
com assinatura VAPID válida, e que dá para decifrar com as chaves da inscrição.
"""

import base64
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import http_ece
import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature

from app.config import get_settings
from app.models import PushSubscription
from app.services.webpush import _send_real
from app.tools.vapid import b64url, generate


@pytest.fixture
def push_service():
    received: list[dict] = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):  # noqa: N802
            body = self.rfile.read(int(self.headers["Content-Length"]))
            received.append({"headers": dict(self.headers), "body": body, "path": self.path})
            code = 410 if self.path.endswith("/sumiu") else 201
            self.send_response(code)
            self.end_headers()

        def log_message(self, *a):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}", received
    server.shutdown()


def b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def verify_es256(token: str, public_key: ec.EllipticCurvePublicKey) -> dict:
    """Confere a assinatura ES256 do JWT do VAPID (sem depender de outra biblioteca)."""
    head, body, sig = token.split(".")
    raw = b64d(sig)
    der = encode_dss_signature(int.from_bytes(raw[:32], "big"), int.from_bytes(raw[32:], "big"))
    public_key.verify(der, f"{head}.{body}".encode(), ec.ECDSA(hashes.SHA256()))  # lança se for inválida
    return json.loads(b64d(body))


def browser_keys():
    """Chaves que o navegador gera ao se inscrever (p256dh + auth)."""
    priv = ec.generate_private_key(ec.SECP256R1())
    pub = priv.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    auth = b"0123456789abcdef"
    return priv, b64url(pub), b64url(auth), auth


def test_envio_real_criptografado_e_assinado(push_service, monkeypatch):
    base, received = push_service
    vapid_pub, vapid_priv = generate()
    s = get_settings()
    monkeypatch.setattr(s, "vapid_public_key", vapid_pub)
    monkeypatch.setattr(s, "vapid_private_key", vapid_priv)

    priv, p256dh, auth_b64, auth = browser_keys()
    sub = PushSubscription(endpoint=f"{base}/push/abc", p256dh=p256dh, auth=auth_b64)
    payload = {"title": "Hora de levar o Milo lá fora", "body": "Ao acordar (06:45).", "tag": "saida-o1", "url": "./#/xixi"}

    r = _send_real(sub, payload)
    assert r.ok and not r.gone
    [req] = received
    h = {k.lower(): v for k, v in req["headers"].items()}
    assert h["content-encoding"] == "aes128gcm"
    assert h["urgency"] == "high"

    # Assinatura VAPID: "vapid t=<jwt>, k=<chave pública>"
    auth_header = h["authorization"]
    token = auth_header.split("t=")[1].split(",")[0]
    k = auth_header.split("k=")[1]
    assert k == vapid_pub
    pub_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), b64d(k))
    claims = verify_es256(token, pub_key)
    assert claims["aud"] == base
    assert claims["sub"] == s.vapid_subject

    # O navegador consegue decifrar.
    plain = http_ece.decrypt(req["body"], private_key=priv, auth_secret=auth, version="aes128gcm")
    assert json.loads(plain) == payload


def test_inscricao_inexistente_vira_gone(push_service, monkeypatch):
    base, _ = push_service
    vapid_pub, vapid_priv = generate()
    s = get_settings()
    monkeypatch.setattr(s, "vapid_public_key", vapid_pub)
    monkeypatch.setattr(s, "vapid_private_key", vapid_priv)
    _, p256dh, auth_b64, _ = browser_keys()
    r = _send_real(PushSubscription(endpoint=f"{base}/push/sumiu", p256dh=p256dh, auth=auth_b64), {"title": "x"})
    assert r.gone and not r.ok
