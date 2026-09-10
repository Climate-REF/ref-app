def test_metrics_records_instrumented_requests(client):
    client.get("/api/v1/utils/about")
    response = client.get("/metrics")
    assert response.status_code == 200
    lines = response.text.splitlines()
    assert any(line.startswith("http_requests_total{") and "/api/v1/utils/about" in line for line in lines)
    assert any(line.startswith("http_request_duration_seconds_count{") for line in lines)


def test_metrics_excludes_health_check(client):
    client.get("/api/v1/utils/health-check/")
    response = client.get("/metrics")
    assert "health-check" not in response.text
    assert 'handler="/metrics"' not in response.text
