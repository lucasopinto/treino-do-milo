import pytest

from app import security
from app.models import Invite
from app.util import now_ms

from .helpers import auth, create_household, household_pair, join


@pytest.fixture(autouse=True)
def _reset_limiter():
    security.join_limiter.reset()
    yield
    security.join_limiter.reset()


def test_criar_casa_devolve_token_e_convite(client):
    body = create_household(client)
    assert len(body["token"]) >= 40
    assert len(body["invite"]["code"]) == 6
    assert body["invite"]["expiresAt"] > now_ms()


def test_token_e_guardado_so_como_hash(client, db):
    from app.models import Device

    body = create_household(client)
    device = db.get(Device, body["deviceId"])
    assert device.token_hash != body["token"]
    assert device.token_hash == security.hash_token(body["token"])


def test_entrar_com_codigo(client):
    lucas, pai = household_pair(client)
    assert pai["householdId"] == lucas["householdId"]
    assert pai["deviceId"] != lucas["deviceId"]
    assert pai["invite"] is None

    me = client.get("/households/me", headers=auth(pai["token"])).json()
    assert [d["name"] for d in me["devices"]] == ["Celular do Lucas", "Celular do Pai"]
    assert [d["isMe"] for d in me["devices"]] == [False, True]


def test_codigo_aceita_minusculas_e_espacos(client):
    lucas = create_household(client)
    code = lucas["invite"]["code"]
    pai = join(client, f" {code[:3].lower()} {code[3:].lower()} ")
    assert pai["householdId"] == lucas["householdId"]


def test_codigo_so_vale_uma_vez(client):
    lucas, _ = household_pair(client)
    r = client.post("/households/join", json={"code": lucas["invite"]["code"], "deviceName": "Outro", "clientDeviceId": "x"})
    assert r.status_code == 404
    assert "inválido ou vencido" in r.json()["detail"]


def test_codigo_vencido(client, db):
    lucas = create_household(client)
    invite = db.get(Invite, lucas["invite"]["code"])
    invite.expires_at = now_ms() - 1
    db.commit()
    r = client.post("/households/join", json={"code": invite.code, "deviceName": "Pai", "clientDeviceId": "p"})
    assert r.status_code == 404


def test_novo_convite(client):
    lucas, _ = household_pair(client)
    r = client.post("/households/invites", headers=auth(lucas["token"]))
    assert r.status_code == 201
    novo = r.json()["code"]
    assert novo != lucas["invite"]["code"]
    tia = join(client, novo, name="Tia", client_device_id="tia")
    assert tia["householdId"] == lucas["householdId"]


def test_sem_token_ou_token_errado(client):
    assert client.get("/households/me").status_code == 401
    assert client.get("/households/me", headers=auth("token-falso")).status_code == 401


def test_casas_ficam_separadas(client):
    a = create_household(client, client_device_id="a")
    b = create_household(client, client_device_id="b")
    me_a = client.get("/households/me", headers=auth(a["token"])).json()
    assert len(me_a["devices"]) == 1
    # Não dá para remover aparelho de outra casa.
    r = client.delete(f"/devices/{b['deviceId']}", headers=auth(a["token"]))
    assert r.status_code == 404


def test_renomear_aparelho(client):
    lucas = create_household(client)
    r = client.patch("/devices/me", json={"name": "iPhone do Lucas"}, headers=auth(lucas["token"]))
    assert r.status_code == 204
    me = client.get("/households/me", headers=auth(lucas["token"])).json()
    assert me["devices"][0]["name"] == "iPhone do Lucas"


def test_remover_aparelho_perdido(client):
    lucas, pai = household_pair(client)
    r = client.delete(f"/devices/{pai['deviceId']}", headers=auth(lucas["token"]))
    assert r.status_code == 204
    # O token do aparelho removido para de funcionar.
    assert client.get("/households/me", headers=auth(pai["token"])).status_code == 401
    assert client.get("/households/me", headers=auth(lucas["token"])).status_code == 200


def test_ultimo_aparelho_sair_apaga_a_casa(client, db):
    from app.models import Household

    lucas = create_household(client)
    r = client.delete(f"/devices/{lucas['deviceId']}", headers=auth(lucas["token"]))
    assert r.status_code == 204
    db.expire_all()
    assert db.get(Household, lucas["householdId"]) is None


def test_limite_de_tentativas_de_codigo(client):
    create_household(client)
    for _ in range(10):
        r = client.post("/households/join", json={"code": "ZZZZZZ", "deviceName": "x", "clientDeviceId": "x"})
        assert r.status_code == 404
    r = client.post("/households/join", json={"code": "ZZZZZZ", "deviceName": "x", "clientDeviceId": "x"})
    assert r.status_code == 429


def test_validacao_de_nome(client):
    r = client.post("/households", json={"deviceName": "", "clientDeviceId": "x"})
    assert r.status_code == 422
