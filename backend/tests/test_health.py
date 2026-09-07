"""
Tests for the liveness and readiness probes
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def restore_readiness_checks(app: FastAPI):
    """
    The app fixture is session scoped, so a test that swaps the checks has to put them back
    """
    original = app.state.readiness_checks
    yield
    app.state.readiness_checks = original


def test_livez(client: TestClient) -> None:
    response = client.get("/livez")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}


def test_readyz_reports_the_database_as_reachable(client: TestClient) -> None:
    response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readyz_with_no_checks_is_ready(app: FastAPI, client: TestClient) -> None:
    app.state.readiness_checks = []

    response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_readyz_reports_failing_checks(app: FastAPI, client: TestClient) -> None:
    def dependency_down():
        return False

    def dependency_raises():
        raise RuntimeError("boom")

    app.state.readiness_checks = [dependency_down, dependency_raises]

    response = client.get("/readyz")
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["dependency_down"] == "check returned a falsy result"
    assert "boom" in detail["dependency_raises"]


def test_the_database_is_registered_as_a_readiness_check(app: FastAPI) -> None:
    assert [c.__name__ for c in app.state.readiness_checks] == ["database_reachable"]
