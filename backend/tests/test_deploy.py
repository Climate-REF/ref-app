"""
Tests for the deployment information route
"""

from fastapi.testclient import TestClient


def test_deploy_info(client: TestClient) -> None:
    response = client.get("/deploy/info")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"version", "git_commit", "image_tag", "build_time"}


def test_deploy_info_reports_build_stamps(monkeypatch, client: TestClient) -> None:
    monkeypatch.setenv("GIT_COMMIT", "abc123")
    monkeypatch.setenv("IMAGE_TAG", "v1.2.3")
    monkeypatch.setenv("BUILD_TIME", "2026-08-21T00:00:00Z")

    response = client.get("/deploy/info")
    body = response.json()
    assert body["git_commit"] == "abc123"
    assert body["image_tag"] == "v1.2.3"
    assert body["build_time"] == "2026-08-21T00:00:00Z"
