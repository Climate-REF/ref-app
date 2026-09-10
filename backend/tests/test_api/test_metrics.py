def test_metrics_exposes_standard_names(client):
    client.get("/api/v1/utils/health-check/")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert "http_request_duration_seconds" in response.text
