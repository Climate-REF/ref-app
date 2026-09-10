import asyncio

import pytest
from fastapi.testclient import TestClient

from climate_ref.models import ExecutionOutput
from ref_backend.api import deps
from ref_backend.api.routes.results import get_result
from ref_backend.testing import test_ref_config, test_settings


def get_result_id(client: TestClient, settings) -> int:
    """Helper to get a valid result ID from an execution."""
    # Get an execution group
    r = client.get(f"{settings.API_V1_STR}/executions")
    assert r.status_code == 200
    data = r.json()

    if not data["data"]:
        pytest.skip("No execution groups available in test data")

    # Look through execution groups to find one with results
    for group in data["data"]:
        group_id = group["id"]

        # Get executions in this group
        r_group = client.get(f"{settings.API_V1_STR}/executions/{group_id}")
        if r_group.status_code == 200:
            group_data = r_group.json()

            # Check if this group has executions with outputs
            if group_data.get("executions"):
                for execution in group_data["executions"]:
                    if execution.get("outputs"):
                        # Found a result
                        return execution["outputs"][0]["id"]

    pytest.skip("No execution results available in test data")


def test_result_get_invalid_id(client: TestClient, settings):
    """Test that getting a result with an invalid ID returns 404."""
    r = client.get(f"{settings.API_V1_STR}/results/99999")

    assert r.status_code == 404


def test_result_get_valid(client: TestClient, settings):
    """Test getting a valid result file."""
    result_id = get_result_id(client, settings)

    r = client.get(f"{settings.API_V1_STR}/results/{result_id}")

    assert r.status_code == 200
    # The results endpoint streams a file, so check that content is not empty
    assert len(r.content) > 0


def test_result_releases_connection_before_streaming():
    """The pooled connection goes back before the body is streamed."""
    database = deps._get_database_dependency(test_settings(), test_ref_config())
    pool = database._engine.pool
    idle = pool.checkedout()

    with database.session_scope() as session:
        reader = deps._get_reader_dependency(database, test_ref_config(), session)
        result = session.query(ExecutionOutput).first()
        if result is None:
            pytest.skip("No execution results available in test data")
        assert pool.checkedout() == idle + 1

        response = asyncio.run(get_result(session, reader, result.id))

        assert response.status_code == 200
        assert pool.checkedout() == idle
