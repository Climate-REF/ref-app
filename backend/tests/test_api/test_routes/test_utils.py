from fastapi.testclient import TestClient
from sqlalchemy import func, select

from climate_ref.models import ExecutionGroup
from ref_backend.api import deps
from ref_backend.testing import test_ref_config, test_settings


def test_health_check(client: TestClient, settings) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/utils/health-check",
    )

    assert r.status_code == 200

    data = r.json()

    assert data is True


def test_about(client: TestClient, settings) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/utils/about",
    )

    assert r.status_code == 200

    data = r.json()

    assert data["app_version"]
    assert data["ref_version"]

    database = deps._get_database_dependency(test_settings(), test_ref_config())
    with database.session_scope() as session:
        last_updated = session.scalar(select(func.max(ExecutionGroup.updated_at)))

    assert data["last_updated"] == last_updated.isoformat()
