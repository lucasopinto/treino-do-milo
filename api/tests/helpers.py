from fastapi.testclient import TestClient


def create_household(client: TestClient, name: str = "Celular do Lucas", client_device_id: str = "dev-lucas") -> dict:
    r = client.post("/households", json={"deviceName": name, "clientDeviceId": client_device_id})
    assert r.status_code == 201, r.text
    return r.json()


def join(client: TestClient, code: str, name: str = "Celular do Pai", client_device_id: str = "dev-pai") -> dict:
    r = client.post("/households/join", json={"code": code, "deviceName": name, "clientDeviceId": client_device_id})
    assert r.status_code == 200, r.text
    return r.json()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def household_pair(client: TestClient) -> tuple[dict, dict]:
    """Casa com dois aparelhos: Lucas (criou) e Pai (entrou)."""
    lucas = create_household(client)
    pai = join(client, lucas["invite"]["code"])
    return lucas, pai
