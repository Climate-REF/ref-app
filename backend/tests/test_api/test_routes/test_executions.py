from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_execution_list_count(client: TestClient, settings) -> None:
    r = client.get(f"{settings.API_V1_STR}/executions")

    assert r.status_code == 200

    data = r.json()

    assert data["count"] == 0
    assert len(data["data"]) == 0
