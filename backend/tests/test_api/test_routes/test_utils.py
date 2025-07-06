from fastapi.testclient import TestClient


def test_health_check(client: TestClient, settings) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/utils/health-check",
    )

    assert r.status_code == 200

    data = r.json()

    assert data is True
