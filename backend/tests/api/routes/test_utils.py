from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from ref_backend.core.config import settings


def test_health_check(client: TestClient, db: Session) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/utils/health-check",
    )

    assert r.status_code == 200

    data = r.json()

    assert data is True
