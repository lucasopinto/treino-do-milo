"""Gera um par de chaves VAPID para o Web Push.

Uso:  python -m app.tools.vapid
Copie as duas linhas para as variáveis de ambiente do servidor (ou para api/.env no computador).
Gere uma vez só: se trocar as chaves, cada celular precisa ativar os avisos de novo.
"""

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def generate() -> tuple[str, str]:
    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_numbers().private_value.to_bytes(32, "big")
    public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return b64url(public), b64url(private)


if __name__ == "__main__":
    pub, priv = generate()
    print(f"MILO_VAPID_PUBLIC_KEY={pub}")
    print(f"MILO_VAPID_PRIVATE_KEY={priv}")
