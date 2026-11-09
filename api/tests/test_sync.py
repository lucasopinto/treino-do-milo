import json
from pathlib import Path

import pytest

from app.services.sync import FUTURE_TOLERANCE_MS, incoming_wins
from app.util import now_ms

from .helpers import auth, create_household, household_pair

CASES = json.loads((Path(__file__).resolve().parents[2] / "shared" / "merge-cases.json").read_text(encoding="utf-8"))["cases"]


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_regra_igual_a_do_app(case):
    cur, inc = case["current"], case["incoming"]
    wins = incoming_wins(cur["updatedAt"], cur["deviceId"], inc["updatedAt"], inc["deviceId"])
    assert wins == (case["winner"] == "incoming")


def rec(id="e1", updated_at=1000, device_id="dev-lucas", collection="eliminations", **data):
    return {
        "collection": collection,
        "id": id,
        "updatedAt": updated_at,
        "deviceId": device_id,
        "data": {"id": id, "createdAt": 1000, "updatedAt": updated_at, "deletedAt": None, "deviceId": device_id, **data},
    }


def push(client, token, *records):
    r = client.post("/sync/push", json={"records": list(records)}, headers=auth(token))
    assert r.status_code == 200, r.text
    return r.json()


def pull(client, token, since=0, **params):
    r = client.get("/sync/pull", params={"since": since, **params}, headers=auth(token))
    assert r.status_code == 200, r.text
    return r.json()


def test_lucas_registra_e_pai_recebe(client):
    lucas, pai = household_pair(client)
    out = push(client, lucas["token"], rec("e1", kind="xixi", place="fora"))
    assert out == {"accepted": 1, "corrections": [], "seq": 1}

    got = pull(client, pai["token"])
    assert got["seq"] == 1 and got["hasMore"] is False
    [r] = got["records"]
    assert r["id"] == "e1" and r["data"]["kind"] == "xixi"

    # Nada novo depois do seq 1.
    assert pull(client, pai["token"], since=1)["records"] == []


def test_edicao_mais_recente_vence_e_antiga_volta_corrigida(client):
    lucas, pai = household_pair(client)
    push(client, lucas["token"], rec("e1", updated_at=2000, place="dentro"))
    # Pai editou o mesmo registro antes (horário menor) e só agora tem internet.
    out = push(client, pai["token"], rec("e1", updated_at=1500, device_id="dev-pai", place="fora"))
    assert out["accepted"] == 0
    [corr] = out["corrections"]
    assert corr["updatedAt"] == 2000 and corr["data"]["place"] == "dentro"


def test_edicao_nova_substitui(client):
    lucas, pai = household_pair(client)
    push(client, lucas["token"], rec("e1", updated_at=2000, place="dentro"))
    out = push(client, pai["token"], rec("e1", updated_at=3000, device_id="dev-pai", place="fora"))
    assert out["accepted"] == 1 and out["corrections"] == []
    [r] = pull(client, lucas["token"], since=1)["records"]
    assert r["data"]["place"] == "fora" and r["deviceId"] == "dev-pai"


def test_reenviar_o_mesmo_registro_nao_muda_nada(client):
    lucas = create_household(client)
    push(client, lucas["token"], rec("e1"))
    out = push(client, lucas["token"], rec("e1"))
    assert out == {"accepted": 0, "corrections": [], "seq": 1}


def test_exclusao_se_propaga(client):
    lucas, pai = household_pair(client)
    push(client, lucas["token"], rec("e1", updated_at=1000))
    deleted = rec("e1", updated_at=2000)
    deleted["data"]["deletedAt"] = 2000
    push(client, lucas["token"], deleted)
    [r] = pull(client, pai["token"])["records"]
    assert r["data"]["deletedAt"] == 2000


def test_relogio_adiantado_e_corrigido(client):
    lucas = create_household(client)
    futuro = now_ms() + FUTURE_TOLERANCE_MS + 3600_000
    out = push(client, lucas["token"], rec("e1", updated_at=futuro))
    assert out["accepted"] == 1
    [corr] = out["corrections"]
    assert corr["updatedAt"] < futuro
    assert corr["data"]["updatedAt"] == corr["updatedAt"]


def test_paginacao(client):
    lucas, pai = household_pair(client)
    push(client, lucas["token"], *[rec(f"e{i}", updated_at=1000 + i) for i in range(7)])
    page1 = pull(client, pai["token"], limit=3)
    assert len(page1["records"]) == 3 and page1["hasMore"] is True
    page2 = pull(client, pai["token"], since=page1["seq"], limit=3)
    page3 = pull(client, pai["token"], since=page2["seq"], limit=3)
    ids = [r["id"] for p in (page1, page2, page3) for r in p["records"]]
    assert ids == [f"e{i}" for i in range(7)]
    assert page3["hasMore"] is False


def test_mesmo_id_em_tabelas_diferentes(client):
    lucas = create_household(client)
    push(
        client,
        lucas["token"],
        rec("2026-11-09", collection="checklist", items={"comida": True}),
        rec("2026-11-09", collection="eliminations"),
    )
    assert len(pull(client, lucas["token"])["records"]) == 2


def test_casas_nao_veem_dados_uma_da_outra(client):
    a = create_household(client, client_device_id="a")
    b = create_household(client, client_device_id="b")
    push(client, a["token"], rec("e1"))
    assert pull(client, b["token"])["records"] == []
    # O mesmo id em outra casa é outro registro.
    assert push(client, b["token"], rec("e1"))["accepted"] == 1


def test_configuracao_padrao_perde_para_a_editada(client):
    """Ao entrar na casa, o celular novo envia as configurações padrão (updatedAt 0): não podem apagar as da casa."""
    lucas, pai = household_pair(client)
    push(client, lucas["token"], rec("settings", collection="settings", updated_at=5000, dogName="Milo"))
    out = push(client, pai["token"], rec("settings", collection="settings", updated_at=0, device_id="dev-pai", dogName="Rex"))
    assert out["accepted"] == 0
    assert out["corrections"][0]["data"]["dogName"] == "Milo"


def test_tabela_desconhecida_e_recusada(client):
    lucas = create_household(client)
    bad = rec("x", collection="senhas")
    r = client.post("/sync/push", json={"records": [bad]}, headers=auth(lucas["token"]))
    assert r.status_code == 422


def test_registro_grande_demais(client):
    lucas = create_household(client)
    r = client.post("/sync/push", json={"records": [rec("e1", note="x" * 400_000)]}, headers=auth(lucas["token"]))
    assert r.status_code == 413


def test_sync_exige_token(client):
    assert client.get("/sync/pull").status_code == 401
    assert client.post("/sync/push", json={"records": []}).status_code == 401
