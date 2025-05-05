from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from ref_backend.core.config import settings


def test_execution_list_count(client: TestClient, db: Session) -> None:
    r = client.get(f"{settings.API_V1_STR}/executions")

    assert r.status_code == 200

    data = r.json()

    assert data["count"] == 0
    assert len(data["data"]) == 0
