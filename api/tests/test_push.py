import base64
import json
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.config import get_settings
from app.models import PushSubscription, SentReminder
from app.routers.push import run_tick
from app.services import reminders, webpush
from app.services.schedule_cache import cache
from app.services.webpush import SendResult
from app.tools.vapid import generate

from .helpers import auth, create_household, household_pair

SP = ZoneInfo("America/Sao_Paulo")


# ---------- regra dos horários (igual a dueOutings do app) ----------


def at(h, m, day=10):
    return datetime(2026, 11, day, h, m, tzinfo=SP)


OUT = [{"id": "o1", "time": "06:45", "label": "Ao acordar"}, {"id": "o2", "time": "23:55", "label": "Antes de dormir"}]


def test_saida_no_horario():
    [d] = reminders.due_outings(OUT, at(6, 45))
    assert d.outing_id == "o1" and d.day == "2026-11-10"


def test_ate_10_minutos_de_atraso():
    assert len(reminders.due_outings(OUT, at(6, 54))) == 1
    assert reminders.due_outings(OUT, at(6, 56)) == []


def test_antes_do_horario_nada():
    assert reminders.due_outings(OUT, at(6, 44)) == []


def test_virada_da_meia_noite():
    [d] = reminders.due_outings(OUT, at(0, 2, day=11))
    assert d.outing_id == "o2" and d.day == "2026-11-10"


def test_horarios_invalidos_sao_ignorados():
    bad = [{"id": "x", "time": "25:00"}, {"id": "y", "time": None}, {"time": "06:45"}]
    assert reminders.due_outings(bad, at(6, 45)) == []


def test_lembretes_desligados():
    s = {"remindersEnabled": False, "outingTimes": OUT}
    assert reminders.reminders_for(s, at(6, 45).astimezone(UTC), "America/Sao_Paulo") == []


def test_mensagem():
    [d] = reminders.due_outings(OUT, at(6, 45))
    m = reminders.message({"dogName": "Milo"}, d)
    assert m["title"] == "Hora de levar o Milo lá fora"
    assert "Ao acordar (06:45)" in m["body"]


# ---------- chaves VAPID ----------


def test_gera_chaves_vapid_validas():
    pub, priv = generate()
    raw = base64.urlsafe_b64decode(pub + "==")
    assert len(raw) == 65 and raw[0] == 4  # ponto P-256 não comprimido
    assert len(base64.urlsafe_b64decode(priv + "=")) == 32


# ---------- API ----------


@pytest.fixture
def push_on(monkeypatch):
    pub, priv = generate()
    s = get_settings()
    monkeypatch.setattr(s, "vapid_public_key", pub)
    monkeypatch.setattr(s, "vapid_private_key", priv)
    monkeypatch.setattr(s, "cron_secret", "segredo-teste")
    sent: list[tuple[str, dict]] = []
    gone: set[str] = set()

    def fake(sub, payload):
        if sub.endpoint in gone:
            return SendResult(ok=False, gone=True)
        sent.append((sub.endpoint, payload))
        return SendResult(ok=True, gone=False)

    monkeypatch.setattr(webpush, "sender", fake)
    return {"sent": sent, "gone": gone, "public": pub}


def subscribe(client, token, endpoint):
    r = client.post(
        "/push/subscribe",
        json={"endpoint": endpoint, "keys": {"p256dh": "BPk-chave", "auth": "auth-xyz"}},
        headers=auth(token),
    )
    assert r.status_code == 204, r.text


def save_settings(client, token, **data):
    rec = {
        "collection": "settings",
        "id": "settings",
        "updatedAt": 5000,
        "deviceId": "dev-lucas",
        "data": {"id": "settings", "dogName": "Milo", "remindersEnabled": True, "outingTimes": OUT, **data},
    }
    assert client.post("/sync/push", json={"records": [rec]}, headers=auth(token)).status_code == 200


def test_chave_publica(client, push_on):
    assert client.get("/push/vapid-public-key").json() == {"publicKey": push_on["public"]}


def test_sem_vapid_push_fica_desligado(client):
    lucas = create_household(client)
    assert client.get("/push/vapid-public-key").json() == {"publicKey": None}
    r = client.post("/push/subscribe", json={"endpoint": "https://push.example/abc", "keys": {"p256dh": "a", "auth": "b"}}, headers=auth(lucas["token"]))
    assert r.status_code == 503


def test_tick_avisa_todos_os_celulares_uma_vez(client, db, push_on):
    lucas, pai = household_pair(client)
    subscribe(client, lucas["token"], "https://push.example/lucas")
    subscribe(client, pai["token"], "https://push.example/pai")
    save_settings(client, lucas["token"])

    out = run_tick(db, at(6, 46).astimezone(UTC))
    assert (out.reminders, out.sent) == (1, 2)
    assert {e for e, _ in push_on["sent"]} == {"https://push.example/lucas", "https://push.example/pai"}
    assert push_on["sent"][0][1]["title"] == "Hora de levar o Milo lá fora"

    # Próximo minuto: não repete.
    out2 = run_tick(db, at(6, 47).astimezone(UTC))
    assert (out2.reminders, out2.sent) == (0, 0)


def test_tick_respeita_lembretes_desligados(client, db, push_on):
    lucas = create_household(client)
    subscribe(client, lucas["token"], "https://push.example/lucas")
    save_settings(client, lucas["token"], remindersEnabled=False)
    assert run_tick(db, at(6, 46).astimezone(UTC)).reminders == 0


def test_inscricao_que_sumiu_e_apagada(client, db, push_on):
    lucas = create_household(client)
    subscribe(client, lucas["token"], "https://push.example/velho")
    save_settings(client, lucas["token"])
    push_on["gone"].add("https://push.example/velho")
    out = run_tick(db, at(6, 46).astimezone(UTC))
    assert out.removed == 1
    db.expire_all()
    assert db.query(PushSubscription).count() == 0


def test_tick_exige_segredo(client, push_on):
    assert client.post("/cron/tick").status_code == 401
    assert client.post("/cron/tick", headers={"X-Cron-Secret": "errado"}).status_code == 401
    r = client.post("/cron/tick", headers={"X-Cron-Secret": "segredo-teste"})
    assert r.status_code == 200 and set(r.json()) == {"households", "reminders", "sent", "removed"}


def test_tick_sem_segredo_configurado_fica_desligado(client):
    assert client.post("/cron/tick", headers={"X-Cron-Secret": ""}).status_code == 401


def test_aviso_de_teste_e_desligar(client, push_on):
    lucas = create_household(client)
    subscribe(client, lucas["token"], "https://push.example/lucas")
    me = client.get("/households/me", headers=auth(lucas["token"])).json()
    assert me["devices"][0]["hasPush"] is True

    r = client.post("/push/test", headers=auth(lucas["token"]))
    assert r.json() == {"sent": 1}

    assert client.delete("/push/subscribe", headers=auth(lucas["token"])).status_code == 204
    assert client.post("/push/test", headers=auth(lucas["token"])).status_code == 404


def test_inscricao_muda_de_dono(client, db, push_on):
    """O mesmo navegador (endpoint) que sai de uma casa e entra em outra não fica duplicado."""
    a = create_household(client, client_device_id="a")
    b = create_household(client, client_device_id="b")
    subscribe(client, a["token"], "https://push.example/mesmo")
    subscribe(client, b["token"], "https://push.example/mesmo")
    db.expire_all()
    [sub] = db.query(PushSubscription).all()
    assert sub.household_id == b["householdId"]


def test_marcas_antigas_sao_limpas(client, db, push_on):
    lucas = create_household(client)
    db.add(SentReminder(household_id=lucas["householdId"], day="2020-01-01", outing_id="o1", sent_at=1))
    db.commit()
    run_tick(db, datetime.now(UTC) - timedelta(seconds=1))
    db.expire_all()
    assert db.query(SentReminder).filter_by(day="2020-01-01").count() == 0


def test_payload_e_json(push_on):
    # O service worker do app lê title/body/tag/url.
    [d] = reminders.due_outings(OUT, at(6, 45))
    assert set(json.loads(json.dumps(reminders.message({}, d)))) == {"title", "body", "tag", "url"}


def test_tick_nao_le_o_banco_sem_motivo(client, db, push_on):
    """Para o banco grátis poder dormir: ticks sem aviso não consultam o banco."""
    lucas = create_household(client)
    subscribe(client, lucas["token"], "https://push.example/lucas")
    save_settings(client, lucas["token"])
    for minute in range(10, 40):
        run_tick(db, at(7, minute).astimezone(UTC))
    assert cache.loads == 1


def test_mudar_a_agenda_vale_no_proximo_tick(client, db, push_on):
    lucas = create_household(client)
    subscribe(client, lucas["token"], "https://push.example/lucas")
    save_settings(client, lucas["token"])
    run_tick(db, at(7, 0).astimezone(UTC))
    novo = {
        "collection": "settings",
        "id": "settings",
        "updatedAt": 9000,
        "deviceId": "dev-lucas",
        "data": {"id": "settings", "dogName": "Milo", "remindersEnabled": True, "outingTimes": [{"id": "n1", "time": "07:30", "label": "Nova"}]},
    }
    client.post("/sync/push", json={"records": [novo]}, headers=auth(lucas["token"]))
    out = run_tick(db, at(7, 30).astimezone(UTC))
    assert out.reminders == 1 and push_on["sent"][-1][1]["body"].startswith("Nova (07:30)")


def test_servidor_reiniciado_nao_repete_aviso(client, db, push_on):
    lucas = create_household(client)
    subscribe(client, lucas["token"], "https://push.example/lucas")
    save_settings(client, lucas["token"])
    assert run_tick(db, at(6, 46).astimezone(UTC)).reminders == 1
    cache.reset()  # como se o processo tivesse reiniciado
    assert run_tick(db, at(6, 47).astimezone(UTC)).reminders == 0
