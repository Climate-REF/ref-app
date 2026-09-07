"""
Tests for the Prometheus metrics endpoint
"""

from fastapi.testclient import TestClient


def test_metrics_exposes_standard_names(client: TestClient, settings) -> None:
    client.get(f"{settings.API_V1_STR}/diagnostics/")

    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert "http_request_duration_seconds" in response.text
